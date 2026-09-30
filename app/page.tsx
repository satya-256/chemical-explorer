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
 * Multi-tier Dynamic Reaction & Synthesis Fetcher:
 * 1. Queries PubChem PUG View API (`/pug_view/data/compound/{cid}/JSON?heading=Synthesis`) to extract live synthesis steps, literature references, and patents.
 * 2. Queries PubChem Parent/Component CIDs to link parent free-acid / salt forms dynamically.
 * 3. Falls back to generating live target-bound literature & patent deep links if no structured reaction steps are indexed.
 */
const fetchDynamicTransformations = async (cid: string, compoundName: string, casNumber: string) => {
  if (!cid || cid === 'N/A') return { previous: [], next: [], synthesisNotes: [] };

  const previousRoutes: any[] = [];
  const nextRoutes: any[] = [];
  const synthesisNotes: any[] = [];

  try {
    // 1. Query PubChem PUG View API specifically for "Synthesis" record headings
    const synthesisUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug_view/data/compound/${cid}/JSON?heading=Synthesis`;
    const synthRes = await fetch(synthesisUrl);

    if (synthRes.ok) {
      const synthData = await synthRes.json();
      const sections = synthData.Record?.Section || [];

      // Recursive function to extract synthesis text paragraphs & patent/paper citations
      const extractSynthesisData = (secList: any[]) => {
        secList.forEach((sec: any) => {
          if (sec.TOCHeading === 'Synthesis' || sec.TOCHeading === 'Methods of Manufacturing') {
            const information = sec.Information || [];
            information.forEach((info: any) => {
              if (info.Value?.StringWithMarkup) {
                info.Value.StringWithMarkup.forEach((strObj: any) => {
                  if (strObj.String) {
                    synthesisNotes.push({
                      text: strObj.String,
                      source: info.ReferenceNumber ? `PubChem Ref #${info.ReferenceNumber}` : 'PubChem Chemical Synthesis Registry'
                    });
                  }
                });
              }
            });
          }
          if (sec.Section) {
            extractSynthesisData(sec.Section);
          }
        });
      };

      extractSynthesisData(sections);
    }

    // Parse extracted synthesis text into structured Precursor cards
    synthesisNotes.forEach((note, index) => {
      previousRoutes.push({
        name: `Published Synthesis Route #${index + 1}`,
        cas: `Literature Process`,
        cid: 'N/A',
        reaction: note.text.length > 180 ? `${note.text.substring(0, 180)}...` : note.text,
        conditions: 'Extract from PubChem Synthesis Section',
        source: note.source,
        link: `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}#section=Synthesis`
      });
    });

    // 2. Query Parent Compound CIDs to build dynamic Structural / Salt form links
    const parentRes = await fetch(
      `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/cids/JSON?cids_type=parent`
    );

    if (parentRes.ok) {
      const parentData = await parentRes.json();
      const parentCids: number[] = parentData.IdentifierList?.CID || [];

      parentCids.forEach((parentCid) => {
        const parentCidStr = parentCid.toString();
        if (parentCidStr !== cid) {
          previousRoutes.push({
            name: `Parent Active Core / Free Acid (CID: ${parentCidStr})`,
            cas: `CID: ${parentCidStr}`,
            cid: parentCidStr,
            reaction: 'Parent Acid / Salt Complex Dissociation',
            conditions: 'PubChem Structural Hierarchy',
            source: 'PubChem Classification',
            link: `https://pubchem.ncbi.nlm.nih.gov/compound/${parentCidStr}`
          });
        }
      });
    }

    // 3. De-duplicate routes
    const uniquePrevious = Array.from(new Map(previousRoutes.map(item => [item.name + item.cid, item])).values());
    const uniqueNext = Array.from(new Map(nextRoutes.map(item => [item.name + item.cid, item])).values());

    return {
      previous: uniquePrevious.slice(0, 6),
      next: uniqueNext.slice(0, 6),
      synthesisNotes
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
    const cleanQuery = sanitizeQuery(queryTerm);

    try {
      // 1. Resolve CID via PubChem API
      let cidUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(cleanQuery)}/cids/JSON`;
      
      if (/^\d+$/.test(cleanQuery)) {
        cidUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cleanQuery}/property/Title/JSON`;
      }

      const cidRes = await fetch(cidUrl);

      if (cidRes.ok) {
        const cidData = await cidRes.json();
        let cid: string | null = null;

        if (cidData.IdentifierList?.CID?.[0]) {
          cid = cidData.IdentifierList.CID[0].toString();
        } else if (/^\d+$/.test(cleanQuery)) {
          cid = cleanQuery;
        }

        if (cid) {
          // Fetch property attributes
          const propUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/property/MolecularFormula,MolecularWeight,CanonicalSMILES,IUPACName,Title/JSON`;
          const propRes = await fetch(propUrl);
          const propData = await propRes.json();
          const props = propData.PropertyTable?.Properties?.[0] || {};

          // Fetch Synonyms & CAS Numbers
          const synUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/synonyms/JSON`;
          const synRes = await fetch(synUrl);
          const synData = await synRes.json();
          const synonymsList = synData.InformationList?.Information?.[0]?.Synonym || [];

          const extractedCas = synonymsList.find((s: string) => /^\d{2,7}-\d{2}-\d$/.test(s)) || (isCasNumber(cleanQuery) ? cleanQuery : 'Available via PubChem');
          const compoundTitle = props.Title || cleanQuery;

          // Fetch dynamic transformation & synthesis reaction pathways
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
              <p className="text-xs text-slate-400 hidden sm:block">PubChem PUG View + NIH CIR Synthesis Engine</p>
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
                placeholder="Enter CAS Registry No., CID, or Chemical Name (e.g. 147098-20-2)..."
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
                    Live PUG-View literature extraction & structural precursor links.
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
                      chemicalData.previous.map((item: any, index: number) => (
                        <div
                          key={index}
                          onClick={() => navigateToChemical(item)}
                          className={`p-5 rounded-2xl border cursor-pointer hover:border-amber-500/50 transition group ${
                            themeMode === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <h4 className="text-base font-bold text-slate-100 group-hover:text-amber-400 transition">
                              {item.name}
                            </h4>
                            <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition" />
                          </div>
                          <p className="text-xs font-mono text-slate-400 mt-1">{item.cas}</p>
                          <div className="mt-3 p-2.5 rounded-xl bg-slate-950 border border-slate-800/60 text-xs text-slate-300">
                            <div className="font-medium text-slate-300 leading-relaxed">{item.reaction}</div>
                            <div className="text-amber-400/80 text-[11px] mt-2 font-mono">{item.source}</div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-2 p-6 rounded-2xl border border-slate-800/80 bg-slate-900/60 space-y-4">
                        <div className="flex items-center space-x-2 text-amber-400 text-xs font-semibold">
                          <BookOpen className="w-4 h-4" />
                          <span>No Direct Structured Pathways Mapped in PubChem Graph</span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          PubChem does not maintain a pre-indexed graph node for <span className="text-indigo-400 font-mono">{chemicalData.name}</span>. You can search the open patent literature and literature index directly below:
                        </p>
                        <div className="flex flex-wrap gap-3 pt-1">
                          {chemicalData.cid !== 'N/A' && (
                            <a
                              href={`https://pubchem.ncbi.nlm.nih.gov/compound/${chemicalData.cid}#section=Synthesis`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3.5 py-2 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 text-xs hover:bg-indigo-600/30 font-medium flex items-center space-x-1.5 transition"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>View PubChem Synthesis Records</span>
                            </a>
                          )}
                          <a
                            href={`https://patents.google.com/?q=${encodeURIComponent(chemicalData.name + ' synthesis')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-xs hover:bg-slate-700 font-medium flex items-center space-x-1.5 transition"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Search Google Patents</span>
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* DOWNSTREAM PRODUCTS */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
                    <ArrowDown className="w-3.5 h-3.5" />
                    <span>Downstream Derivatives & Salt Forms</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {chemicalData.next && chemicalData.next.length > 0 ? (
                      chemicalData.next.map((item: any, index: number) => (
                        <div
                          key={index}
                          onClick={() => navigateToChemical(item)}
                          className={`p-5 rounded-2xl border cursor-pointer hover:border-emerald-500/50 transition group ${
                            themeMode === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <h4 className="text-base font-bold text-slate-100 group-hover:text-emerald-400 transition">
                              {item.name}
                            </h4>
                            <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition" />
                          </div>
                          <p className="text-xs font-mono text-slate-400 mt-1">{item.cas}</p>
                          <div className="mt-3 p-2.5 rounded-xl bg-slate-950 border border-slate-800/60 text-xs text-slate-300">
                            <div className="font-semibold text-emerald-400/90 mb-0.5">{item.reaction}</div>
                            <div className="text-slate-400 text-[11px]">{item.conditions}</div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-2 p-6 rounded-2xl border border-slate-800/80 bg-slate-900/40 text-center text-xs text-slate-400 italic">
                        No direct downstream derivatives indexed for this compound.
                      </div>
                    )}
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