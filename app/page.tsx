"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  FlaskConical, 
  ArrowDown, 
  Copy, 
  Check, 
  Info, 
  RefreshCw, 
  Atom, 
  X,
  ExternalLink,
  BookOpen,
  FileText
} from 'lucide-react';

/**
 * Multi-Source Synthesis & Pathway Engine (works for any CAS / name / CID that PubChem knows):
 *  - PUG View, several headings fetched in parallel (each fails silently on its own):
 *      Methods of Manufacturing / Synthesis  -> upstream synthesis routes
 *      Uses / Metabolism-Metabolites         -> downstream uses & transformations
 *  - PUG REST related-CID lookups: parent, component, same_parent_connectivity (salts / related forms)
 *  - Batched title lookup that never discards results: falls back to `CID: <id>`
 * Note: PubChem only holds manufacturing / synthesis text for part of its records.
 * Where nothing exists, the UI shows direct patent / literature search links instead.
 */
const PUBCHEM_REST = 'https://pubchem.ncbi.nlm.nih.gov/rest';
const CAS_REGEX = /^\d{2,7}-\d{2}-\d$/;

const UPSTREAM_HEADINGS = ['Methods of Manufacturing', 'Synthesis'];
const DOWNSTREAM_HEADINGS = ['Uses', 'Metabolism/Metabolites'];

// Never throws: returns null on network error, timeout, 404 or bad JSON.
const safeFetchJson = async (url: string, timeoutMs = 15000): Promise<any | null> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
};

const fetchTitles = async (cids: string[]): Promise<Map<string, string>> => {
  const map = new Map<string, string>();
  if (cids.length === 0) return map;
  const data = await safeFetchJson(`${PUBCHEM_REST}/pug/compound/cid/${cids.join(',')}/property/Title/JSON`);
  (data?.PropertyTable?.Properties || []).forEach((p: any) => {
    if (p?.CID !== undefined && p?.Title) map.set(String(p.CID), p.Title);
  });
  return map;
};

const fetchCidList = async (cid: string, cidsType: string): Promise<string[]> => {
  const data = await safeFetchJson(`${PUBCHEM_REST}/pug/compound/cid/${cid}/cids/JSON?cids_type=${cidsType}`);
  const list: any[] = data?.IdentifierList?.CID || [];
  return list.map((c) => String(c)).filter((c) => c !== '0' && c !== cid);
};

// Walks a PUG View record and pulls out every free-text entry, with its section heading and source.
const extractPugViewNotes = (data: any, fallbackHeading: string) => {
  const notes: { text: string; heading: string; source: string }[] = [];
  const refs = new Map<string, string>();
  (data?.Record?.Reference || []).forEach((r: any) => {
    if (r?.ReferenceNumber !== undefined) refs.set(String(r.ReferenceNumber), r.SourceName || r.Name || '');
  });

  const walk = (sections: any[], heading: string) => {
    sections.forEach((sec: any) => {
      const currentHeading = sec.TOCHeading || heading;
      (sec.Information || []).forEach((info: any) => {
        (info.Value?.StringWithMarkup || []).forEach((strObj: any) => {
          const text = (strObj?.String || '').trim();
          if (text.length >= 25) {
            const refName = refs.get(String(info.ReferenceNumber));
            notes.push({
              text,
              heading: currentHeading,
              source: refName ? `PubChem · ${refName}` : 'PubChem PUG View'
            });
          }
        });
      });
      if (sec.Section) walk(sec.Section, currentHeading);
    });
  };

  walk(data?.Record?.Section || [], fallbackHeading);
  return notes;
};

const fetchPugViewNotes = async (cid: string, headings: string[]) => {
  const results = await Promise.all(
    headings.map(async (heading) => {
      const data = await safeFetchJson(
        `${PUBCHEM_REST}/pug_view/data/compound/${cid}/JSON?heading=${encodeURIComponent(heading)}`
      );
      return data ? extractPugViewNotes(data, heading) : [];
    })
  );
  const seen = new Set<string>();
  return results.flat().filter((n) => {
    const key = n.text.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const noteToRoute = (note: { text: string; heading: string; source: string }, cid: string, label: string) => ({
  name: label,
  cas: note.heading,
  cid: 'N/A',
  reaction: note.text,
  conditions: note.heading,
  source: note.source,
  link: `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}#section=${encodeURIComponent(note.heading.replace(/\s+/g, '-'))}`
});

const fetchDynamicTransformations = async (cid: string, compoundName: string, casNumber: string) => {
  if (!cid || cid === 'N/A') return { previous: [], next: [], synthesisNotes: [] };

  try {
    // All requests run in parallel and each one fails independently.
    const [synthNotes, downstreamNotes, parentCids, componentCids, relatedCids] = await Promise.all([
      fetchPugViewNotes(cid, UPSTREAM_HEADINGS),
      fetchPugViewNotes(cid, DOWNSTREAM_HEADINGS),
      fetchCidList(cid, 'parent'),
      fetchCidList(cid, 'component'),
      fetchCidList(cid, 'same_parent_connectivity')
    ]);

    // One batched title lookup for every linked compound; missing titles fall back to `CID: <id>`.
    const parentSet = new Set(parentCids);
    const componentSet = new Set(componentCids);
    const relatedOnly = relatedCids.filter((c) => !parentSet.has(c) && !componentSet.has(c)).slice(0, 8);
    const allLinked = Array.from(new Set([...parentCids, ...componentCids.slice(0, 6), ...relatedOnly]));
    const titles = await fetchTitles(allLinked);
    const titleOf = (c: string) => titles.get(c) || `CID: ${c}`;

    const cidRoute = (c: string, reaction: string, conditions: string, source: string) => ({
      name: titleOf(c),
      cas: `CID: ${c}`,
      cid: c,
      reaction,
      conditions,
      source,
      link: `https://pubchem.ncbi.nlm.nih.gov/compound/${c}`
    });

    // UPSTREAM: published synthesis / manufacturing text, then parent and component compounds
    const previousRoutes: any[] = [
      ...synthNotes.slice(0, 10).map((n, i) => noteToRoute(n, cid, `${n.heading} #${i + 1}`)),
      ...parentCids.map((c) =>
        cidRoute(c, 'Parent compound (free base / core structure)', 'PubChem Hierarchy', 'PubChem Classification')
      ),
      ...componentCids.slice(0, 6).map((c) =>
        cidRoute(c, 'Component / building block of this substance', 'PubChem Component Link', 'PubChem Classification')
      )
    ];

    // DOWNSTREAM: known uses / transformations text, then salt forms and related structures
    const nextRoutes: any[] = [
      ...downstreamNotes.slice(0, 10).map((n, i) => noteToRoute(n, cid, `${n.heading} #${i + 1}`)),
      ...relatedOnly.map((c) =>
        cidRoute(c, 'Salt form / related derivative sharing the same parent', 'PubChem Same-Parent Link', 'PubChem Classification')
      )
    ];

    const dedupe = (items: any[]) =>
      Array.from(new Map(items.map((item) => [item.cid === 'N/A' ? item.reaction : item.cid, item])).values());

    return {
      previous: dedupe(previousRoutes).slice(0, 14),
      next: dedupe(nextRoutes).slice(0, 14),
      synthesisNotes: synthNotes
    };
  } catch (err) {
    console.warn('Dynamic pathway fetch error:', err);
    return { previous: [], next: [], synthesisNotes: [] };
  }
};

export default function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [chemicalData, setChemicalData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showSynonymsModal, setShowSynonymsModal] = useState(false);
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>('dark');
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});

  const sanitizeQuery = (str: string) => str.trim().replace(/[\u2010-\u2015]/g, '-');
  const isCasNumber = (str: string) => /^\d{2,7}-\d{2}-\d$/.test(sanitizeQuery(str));

  const copyToClipboard = (text: string, field: string) => {
    if (!text || text === 'N/A') return;
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const fetchFromNihCir = async (queryTerm: string) => {
    const cleanQuery = encodeURIComponent(sanitizeQuery(queryTerm));
    const baseUrl = `https://cactus.nci.nih.gov/chemical/structure/${cleanQuery}`;

    try {
      const [iupacRes, formulaRes, mwRes, smilesRes, casRes] = await Promise.allSettled([
        fetch(`${baseUrl}/iupac_name`),
        fetch(`${baseUrl}/formula`),
        fetch(`${baseUrl}/mw`),
        fetch(`${baseUrl}/smiles`),
        fetch(`${baseUrl}/cas`)
      ]);

      const getResult = async (res: PromiseSettledResult<Response>) => {
        if (res.status === 'fulfilled' && res.value.ok) {
          const text = await res.value.text();
          return text.trim();
        }
        return null;
      };

      const iupac = await getResult(iupacRes);
      const formula = await getResult(formulaRes);
      const mw = await getResult(mwRes);
      const smiles = await getResult(smilesRes);
      const casList = await getResult(casRes);

      if (formula || smiles || iupac) {
        const resolvedCas = casList ? casList.split('\n')[0].trim() : (isCasNumber(queryTerm) ? queryTerm : 'N/A');
        
        return {
          cid: 'N/A',
          name: iupac || queryTerm,
          cas: resolvedCas,
          formula: formula || 'N/A',
          mw: mw ? `${mw} g/mol` : 'N/A',
          smiles: smiles || 'N/A',
          iupac: iupac || queryTerm,
          synonyms: [iupac, queryTerm, resolvedCas].filter(Boolean),
          previous: [],
          next: []
        };
      }
    } catch (err) {
      console.warn("NIH CIR lookup error:", err);
    }
    return null;
  };

  const fetchChemical = useCallback(async (queryTerm: string) => {
    if (!queryTerm.trim()) {
      setChemicalData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setExpandedNotes({});
    const cleanQuery = sanitizeQuery(queryTerm);

    try {
      // 1. Resolve CID via PubChem (CAS numbers are tried as registry IDs first, then as names)
      let cid: string | null = null;

      if (/^\d+$/.test(cleanQuery)) {
        const d = await safeFetchJson(`${PUBCHEM_REST}/pug/compound/cid/${cleanQuery}/property/Title/JSON`);
        if (d?.PropertyTable?.Properties?.[0]) cid = cleanQuery;
      } else {
        const candidateUrls: string[] = [];
        if (isCasNumber(cleanQuery)) {
          candidateUrls.push(`${PUBCHEM_REST}/pug/compound/xref/RegistryID/${encodeURIComponent(cleanQuery)}/cids/JSON`);
        }
        candidateUrls.push(`${PUBCHEM_REST}/pug/compound/name/${encodeURIComponent(cleanQuery)}/cids/JSON`);

        for (const url of candidateUrls) {
          const d = await safeFetchJson(url);
          const first = d?.IdentifierList?.CID?.[0];
          if (first && first !== 0) {
            cid = first.toString();
            break;
          }
        }
      }

      if (cid) {
        // Fetch property attributes
        const propData = await safeFetchJson(
          `${PUBCHEM_REST}/pug/compound/cid/${cid}/property/MolecularFormula,MolecularWeight,CanonicalSMILES,IUPACName,Title/JSON`
        );
        const props = propData?.PropertyTable?.Properties?.[0] || {};

        // Fetch Synonyms & CAS Numbers
        const synData = await safeFetchJson(`${PUBCHEM_REST}/pug/compound/cid/${cid}/synonyms/JSON`);
        const synonymsList: string[] = synData?.InformationList?.Information?.[0]?.Synonym || [];

        const extractedCas = isCasNumber(cleanQuery)
          ? cleanQuery
          : synonymsList.find((s: string) => CAS_REGEX.test(s)) || 'Available via PubChem';
        const compoundTitle = props.Title || cleanQuery;

        // Fetch synthesis / manufacturing / related-compound pathways
        const dynamicData = await fetchDynamicTransformations(cid, compoundTitle, extractedCas);

        setChemicalData({
          cid: cid,
          name: compoundTitle,
          cas: extractedCas,
          formula: props.MolecularFormula || 'N/A',
          mw: props.MolecularWeight ? `${props.MolecularWeight} g/mol` : 'N/A',
          smiles: props.CanonicalSMILES || 'N/A',
          iupac: props.IUPACName || props.Title || 'N/A',
          synonyms: synonymsList.slice(0, 25),
          previous: dynamicData.previous,
          next: dynamicData.next
        });

        setLoading(false);
        return;
      }

      // 2. NIH CIR Fallback
      const nihResult = await fetchFromNihCir(cleanQuery);
      if (nihResult) {
        setChemicalData(nihResult);
        setLoading(false);
        return;
      }

      setChemicalData(null);
      setError(`No compound matches found for query "${cleanQuery}".`);

    } catch (err) {
      setError(`Failed to fetch chemical details for "${cleanQuery}".`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeQuery) {
      fetchChemical(activeQuery);
    }
  }, [activeQuery, fetchChemical]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setActiveQuery(searchQuery.trim());
    }
  };

  const navigateToChemical = (item: any) => {
    if (item.cid && item.cid !== 'N/A') {
      const cleanTerm = item.cid.toString().replace(/^CID:\s*/i, '');
      setSearchQuery(cleanTerm);
      setActiveQuery(cleanTerm);
    } else if (item.link) {
      window.open(item.link, '_blank');
    }
  };

  const renderRouteCard = (item: any, index: number, kind: 'up' | 'down') => {
    const key = `${kind}-${index}`;
    const isNote = item.cid === 'N/A';
    const expanded = !!expandedNotes[key];
    const isLong = isNote && item.reaction.length > 220;
    const hoverBorder = kind === 'up' ? 'hover:border-amber-500/50' : 'hover:border-emerald-500/50';
    const hoverText = kind === 'up' ? 'group-hover:text-amber-400' : 'group-hover:text-emerald-400';
    const tagText = kind === 'up' ? 'text-amber-400/80' : 'text-emerald-400/80';

    return (
      <div
        key={key}
        onClick={() => navigateToChemical(item)}
        className={`p-5 rounded-2xl border cursor-pointer ${hoverBorder} transition group ${
          themeMode === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex justify-between items-start">
          <h4 className={`text-base font-bold text-slate-100 ${hoverText} transition`}>{item.name}</h4>
          <ExternalLink className={`w-4 h-4 text-slate-500 ${hoverText} transition flex-shrink-0 ml-2`} />
        </div>
        <p className="text-xs font-mono text-slate-400 mt-1">{item.cas}</p>
        <div className="mt-3 p-2.5 rounded-xl bg-slate-950 border border-slate-800/60 text-xs text-slate-300">
          <div className="font-medium text-slate-300 leading-relaxed">
            {isLong && !expanded ? `${item.reaction.substring(0, 220)}...` : item.reaction}
          </div>
          {isLong && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setExpandedNotes((prev) => ({ ...prev, [key]: !prev[key] }));
              }}
              className="mt-2 text-[11px] text-indigo-400 hover:text-indigo-300 font-medium"
            >
              {expanded ? 'Show less' : 'Show full text'}
            </button>
          )}
          {!isNote && item.conditions && <div className="text-slate-400 text-[11px] mt-1.5">{item.conditions}</div>}
          <div className={`${tagText} text-[11px] mt-2 font-mono`}>{item.source}</div>
        </div>
      </div>
    );
  };
  return (
    <div className={`min-h-screen transition-colors duration-200 ${themeMode === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} font-sans`}>
      {/* Header */}
      <header className={`border-b sticky top-0 z-30 backdrop-blur-md ${themeMode === 'dark' ? 'bg-slate-900/90 border-slate-800' : 'bg-white/90 border-slate-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-500/30 flex items-center justify-center">
              <Atom className="w-6 h-6 animate-spin-slow" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                ChemExplorer <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 ml-2">Live API</span>
              </h1>
              <p className="text-xs text-slate-400 hidden sm:block">PubChem PUG View Synthesis & Manufacturing Engine</p>
            </div>
          </div>

          <button
            onClick={() => setThemeMode(themeMode === 'dark' ? 'light' : 'dark')}
            className={`p-2 rounded-lg border text-xs font-medium transition ${
              themeMode === 'dark' 
                ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200' 
                : 'border-slate-300 bg-white hover:bg-slate-100 text-slate-700'
            }`}
          >
            {themeMode === 'dark' ? '☀️ Light' : '🌙 Dark'}
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Search Bar */}
        <section className="space-y-4">
          <div className="max-w-3xl mx-auto">
            <form onSubmit={handleSearchSubmit} className="relative flex items-center">
              <div className="absolute left-4 pointer-events-none text-slate-400">
                <Search className="w-5 h-5" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter CAS Registry No., CID, or Chemical Name (e.g. Toluene, 108-88-3, or 147098-20-2)..."
                className={`w-full pl-12 pr-32 py-4 rounded-2xl text-sm font-medium border transition-all duration-200 shadow-xl focus:outline-none focus:ring-2 ${
                  themeMode === 'dark'
                    ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500 focus:ring-indigo-500'
                    : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:ring-indigo-500'
                }`}
              />
              <button
                type="submit"
                disabled={loading}
                className="absolute right-2.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-xl transition-all shadow-md shadow-indigo-600/30 flex items-center space-x-2 disabled:opacity-50"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Search</span>}
              </button>
            </form>
          </div>
        </section>

        {error && (
          <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Info className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="underline hover:text-white">Dismiss</button>
          </div>
        )}

        {loading ? (
          <div className="py-24 text-center space-y-4">
            <div className="inline-block p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 animate-pulse">
              <FlaskConical className="w-12 h-12 animate-bounce" />
            </div>
            <p className="text-slate-400 text-sm font-medium">Fetching Live Compound Details & Reaction Network...</p>
          </div>
        ) : chemicalData ? (
          <>
            {/* Compound Profile Card */}
            <section className={`p-6 sm:p-8 rounded-3xl border shadow-2xl relative overflow-hidden transition-all ${
              themeMode === 'dark' ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex flex-col lg:flex-row gap-8 items-start">
                
                {/* 2D Structure */}
                <div className="w-full lg:w-5/12 flex flex-col items-center">
                  <div className={`w-full aspect-square max-w-sm rounded-2xl p-6 border flex flex-col items-center justify-center relative group shadow-inner ${
                    themeMode === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-300'
                  }`}>
                    {chemicalData.cid !== 'N/A' ? (
                      <img
                        src={`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${chemicalData.cid}/PNG?record_type=2d&image_size=300x300`}
                        alt={chemicalData.name}
                        className="w-full h-full object-contain filter drop-shadow-md"
                        onError={(e: any) => {
                          e.target.onerror = null;
                          e.target.src = 'https://via.placeholder.com/300?text=Structure+Image+Unavailable';
                        }}
                      />
                    ) : (
                      <div className="text-slate-500 text-xs text-center">Structure rendering unavailable</div>
                    )}
                  </div>

                  <div className="flex gap-2 mt-4 w-full max-w-sm">
                    <button
                      onClick={() => copyToClipboard(chemicalData.smiles, 'smiles')}
                      className={`flex-1 py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center space-x-1.5 transition ${
                        themeMode === 'dark'
                          ? 'border-slate-800 bg-slate-950 hover:bg-slate-800 text-slate-300'
                          : 'border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {copiedField === 'smiles' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedField === 'smiles' ? 'Copied' : 'Copy SMILES'}</span>
                    </button>

                    <button
                      onClick={() => copyToClipboard(chemicalData.cas, 'cas')}
                      className={`flex-1 py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center space-x-1.5 transition ${
                        themeMode === 'dark'
                          ? 'border-slate-800 bg-slate-950 hover:bg-slate-800 text-slate-300'
                          : 'border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {copiedField === 'cas' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedField === 'cas' ? 'Copied' : 'Copy CAS'}</span>
                    </button>
                  </div>
                </div>

                {/* Compound Meta Details */}
                <div className="w-full lg:w-7/12 space-y-6">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-indigo-400">
                      {chemicalData.name}
                    </h2>
                    <p className="text-xs text-slate-400 mt-1 font-mono break-all">
                      IUPAC: {chemicalData.iupac}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className={`p-4 rounded-2xl border ${themeMode === 'dark' ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="text-xs text-slate-400 uppercase font-semibold mb-1">CAS Registry No.</div>
                      <div className="text-lg font-mono font-bold text-indigo-400">{chemicalData.cas}</div>
                    </div>

                    <div className={`p-4 rounded-2xl border ${themeMode === 'dark' ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="text-xs text-slate-400 uppercase font-semibold mb-1">Molecular Formula</div>
                      <div className="text-lg font-mono font-bold text-cyan-400">{chemicalData.formula}</div>
                    </div>

                    <div className={`p-4 rounded-2xl border ${themeMode === 'dark' ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="text-xs text-slate-400 uppercase font-semibold mb-1">Molecular Weight</div>
                      <div className="text-lg font-mono font-bold text-emerald-400">{chemicalData.mw}</div>
                    </div>

                    <div className={`p-4 rounded-2xl border ${themeMode === 'dark' ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="text-xs text-slate-400 uppercase font-semibold mb-1">PubChem CID</div>
                      <div className="text-lg font-mono font-bold text-purple-400">{chemicalData.cid}</div>
                    </div>
                  </div>

                  {/* Synonyms */}
                  {chemicalData.synonyms && chemicalData.synonyms.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-400 uppercase">
                          Synonyms & Identifiers ({chemicalData.synonyms.length})
                        </span>
                        <button
                          onClick={() => setShowSynonymsModal(true)}
                          className="text-xs text-indigo-400 hover:underline"
                        >
                          View All
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {chemicalData.synonyms.slice(0, 5).map((syn: string, idx: number) => (
                          <span
                            key={idx}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${
                              themeMode === 'dark'
                                ? 'bg-slate-950 border-slate-800 text-slate-300'
                                : 'bg-slate-100 border-slate-200 text-slate-700'
                            }`}
                          >
                            {syn}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Reaction Pathways Explorer */}
            <section className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-lg font-bold tracking-tight text-slate-100">
                    Synthesis & Reaction Pathway Explorer
                  </h3>
                  <p className="text-xs text-slate-400">
                    Live PUG-View manufacturing / synthesis extraction, parent & salt-form links.
                  </p>
                </div>
              </div>

              <div className="space-y-8">
                {/* UPSTREAM PRECURSORS & SYNTHESIS ROUTES */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-amber-400">
                    <ArrowDown className="w-3.5 h-3.5" />
                    <span>Upstream Precursors & Synthesis Methods</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {chemicalData.previous && chemicalData.previous.length > 0 ? (
                      chemicalData.previous.map((item: any, index: number) => renderRouteCard(item, index, 'up'))
                    ) : (
                      <div className="col-span-2 p-6 rounded-2xl border border-slate-800/80 bg-slate-900/60 space-y-2">
                        <div className="flex items-center space-x-2 text-amber-400 text-xs font-semibold">
                          <BookOpen className="w-4 h-4" />
                          <span>No synthesis or manufacturing text found in PubChem</span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          PubChem has no manufacturing or synthesis entry for{' '}
                          <span className="text-indigo-400 font-mono">{chemicalData.name}</span>
                          {chemicalData.cid === 'N/A' ? ' (the record came from the NIH CIR fallback, not PubChem)' : ''}. Use the
                          patent and literature searches below.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* DOWNSTREAM PRODUCTS */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
                    <ArrowDown className="w-3.5 h-3.5" />
                    <span>Downstream Uses, Derivatives & Salt Forms</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {chemicalData.next && chemicalData.next.length > 0 ? (
                      chemicalData.next.map((item: any, index: number) => renderRouteCard(item, index, 'down'))
                    ) : (
                      <div className="col-span-2 p-6 rounded-2xl border border-slate-800/80 bg-slate-900/40 text-center text-xs text-slate-400 italic">
                        No downstream uses, derivatives or salt forms indexed in PubChem for this compound.
                      </div>
                    )}
                  </div>
                </div>

                {/* SEARCH LINKS (always shown, so every CAS number has a next step) */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-indigo-400">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Find More Synthesis Sources</span>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {chemicalData.cid !== 'N/A' && (
                      <a
                        href={`https://pubchem.ncbi.nlm.nih.gov/compound/${chemicalData.cid}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-2 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 text-xs hover:bg-indigo-600/30 font-medium flex items-center space-x-1.5 transition"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Open PubChem Record</span>
                      </a>
                    )}
                    <a
                      href={`https://patents.google.com/?q=${encodeURIComponent(
                        (CAS_REGEX.test(chemicalData.cas) ? chemicalData.cas : chemicalData.name) + ' synthesis'
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-xs hover:bg-slate-700 font-medium flex items-center space-x-1.5 transition"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Google Patents</span>
                    </a>
                    <a
                      href={`https://scholar.google.com/scholar?q=${encodeURIComponent(
                        `"${chemicalData.name}" synthesis process` + (CAS_REGEX.test(chemicalData.cas) ? ` "${chemicalData.cas}"` : '')
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-xs hover:bg-slate-700 font-medium flex items-center space-x-1.5 transition"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Google Scholar</span>
                    </a>
                  </div>
                </div>
              </div>
            </section>
          </>
        ) : null}
      </main>

      {/* Synonyms Modal */}
      {showSynonymsModal && chemicalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-2xl w-full max-h-[80vh] flex flex-col space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-lg text-slate-100">
                All Synonyms for {chemicalData.name}
              </h3>
              <button
                onClick={() => setShowSynonymsModal(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-1.5 pr-2">
              {chemicalData.synonyms.map((syn: string, idx: number) => (
                <div key={idx} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/60 text-xs text-slate-300 font-mono">
                  {syn}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}