"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  FlaskConical, 
  ArrowDown, 
  Layers, 
  Copy, 
  Check, 
  Info, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp, 
  Atom, 
  Zap,
  ExternalLink,
  Globe
} from 'lucide-react';

/**
 * Fully dynamic pathway fetcher:
 * 1. Checks PubChem Transformations API.
 * 2. If empty, checks PubChem Related Records (Parent/Component CIDs).
 * 3. Builds direct CID/CAS links dynamically with zero hardcoded entries.
 */
const fetchDynamicTransformations = async (cid: string) => {
  if (!cid || cid === 'N/A') return { previous: [], next: [] };

  const previousRoutes: any[] = [];
  const nextRoutes: any[] = [];

  try {
    // Attempt 1: Fetch PubChem Transformations Registry
    const transformRes = await fetch(
      `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/transformations/JSON`
    );

    if (transformRes.ok) {
      const data = await transformRes.json();
      const rows = data.Transformations?.Row || [];

      rows.forEach((row: any) => {
        const reactantCid = row.ReactantCID?.toString();
        const productCid = row.ProductCID?.toString();
        const reactionName = row.TransformationName || 'Chemical Transformation';

        if (productCid === cid && reactantCid) {
          previousRoutes.push({
            name: `Precursor (CID: ${reactantCid})`,
            cas: `CID: ${reactantCid}`,
            cid: reactantCid,
            reaction: reactionName,
            conditions: 'PubChem Transformations Registry',
            source: 'PubChem Index',
            doi: ''
          });
        }

        if (reactantCid === cid && productCid) {
          nextRoutes.push({
            name: `Derivative (CID: ${productCid})`,
            cas: `CID: ${productCid}`,
            cid: productCid,
            reaction: reactionName,
            conditions: 'PubChem Transformations Registry',
            source: 'PubChem Index',
            doi: ''
          });
        }
      });
    }

    // Attempt 2: If Transformations API is empty, query PubChem Parent & Component CIDs dynamically
    if (previousRoutes.length === 0 && nextRoutes.length === 0) {
      const cidsUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/cids/JSON?cids_type=parent,component`;
      const cidsRes = await fetch(cidsUrl);

      if (cidsRes.ok) {
        const cidsData = await cidsRes.json();
        const relatedCids: number[] = cidsData.IdentifierList?.CID || [];

        relatedCids.forEach((relatedCid) => {
          const relCidStr = relatedCid.toString();
          if (relCidStr !== cid) {
            previousRoutes.push({
              name: `Parent Core / Structural Precursor (CID: ${relCidStr})`,
              cas: `CID: ${relCidStr}`,
              cid: relCidStr,
              reaction: 'Parent Core / Intermediary Fragment Link',
              conditions: 'PubChem Structural Hierarchy',
              source: 'PubChem Classification',
              doi: ''
            });

            nextRoutes.push({
              name: `Related Salt / Complex Form (CID: ${relCidStr})`,
              cas: `CID: ${relCidStr}`,
              cid: relCidStr,
              reaction: 'Salt Formation / Derivative Link',
              conditions: 'PubChem Structural Hierarchy',
              source: 'PubChem Classification',
              doi: ''
            });
          }
        });
      }
    }

    return {
      previous: previousRoutes.slice(0, 6),
      next: nextRoutes.slice(0, 6)
    };
  } catch (err) {
    console.warn('Dynamic pathway fetch failed:', err);
    return { previous: [], next: [] };
  }
};

export default function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [chemicalData, setChemicalData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolverSource, setResolverSource] = useState<'pubchem' | 'nih_cir' | 'web_search'>('pubchem');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showSynonymsModal, setShowSynonymsModal] = useState(false);
  const [themeMode, setThemeMode] = useState('dark');

  const sanitizeQuery = (str: string) => str.trim().replace(/[\u2010-\u2015]/g, '-');
  const isCasNumber = (str: string) => /^\d{2,7}-\d{2}-\d$/.test(sanitizeQuery(str));

  const copyToClipboard = (text: string, field: string) => {
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
      // 1. Fetch PubChem details
      const cidUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(cleanQuery)}/cids/JSON`;
      const cidRes = await fetch(cidUrl);

      if (cidRes.ok) {
        const cidData = await cidRes.json();
        if (cidData.IdentifierList && cidData.IdentifierList.CID && cidData.IdentifierList.CID.length > 0) {
          const cid = cidData.IdentifierList.CID[0];

          const propUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/property/MolecularFormula,MolecularWeight,CanonicalSMILES,IUPACName,Title/JSON`;
          const propRes = await fetch(propUrl);
          const propData = await propRes.json();
          const props = propData.PropertyTable.Properties[0];

          const synUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/synonyms/JSON`;
          const synRes = await fetch(synUrl);
          const synData = await synRes.json();
          const synonymsList = synData.InformationList?.Information[0]?.Synonym || [];

          const extractedCas = synonymsList.find((s: string) => /^\d{2,7}-\d{2}-\d$/.test(s)) || (isCasNumber(cleanQuery) ? cleanQuery : 'Available via PubChem');
          
          // Fetch dynamic transformations live from PubChem API
          const dynamicData = await fetchDynamicTransformations(cid.toString());

          setChemicalData({
            cid: cid.toString(),
            name: props.Title || cleanQuery,
            cas: extractedCas,
            formula: props.MolecularFormula || 'N/A',
            mw: props.MolecularWeight ? `${props.MolecularWeight} g/mol` : 'N/A',
            smiles: props.CanonicalSMILES || 'N/A',
            iupac: props.IUPACName || props.Title || 'N/A',
            synonyms: synonymsList.slice(0, 25),
            previous: dynamicData.previous,
            next: dynamicData.next
          });

          setResolverSource('pubchem');
          setLoading(false);
          return;
        }
      }

      // 2. NIH CIR Fallback
      const nihResult = await fetchFromNihCir(cleanQuery);
      if (nihResult) {
        setChemicalData(nihResult);
        setResolverSource('nih_cir');
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

  const navigateToChemical = (targetTerm: string) => {
    if (targetTerm && targetTerm !== 'N/A') {
      const cleanTerm = targetTerm.replace(/^CID:\s*/i, '');
      setSearchQuery(cleanTerm);
      setActiveQuery(cleanTerm);
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-200 ${themeMode === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} font-sans`}>
      <header className={`border-b sticky top-0 z-30 backdrop-blur-md ${themeMode === 'dark' ? 'bg-slate-900/90 border-slate-800' : 'bg-white/90 border-slate-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-500/30 flex items-center justify-center">
              <Atom className="w-6 h-6 animate-spin-slow" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                ChemExplorer <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 ml-2">Dynamic Live API</span>
              </h1>
              <p className="text-xs text-slate-400 hidden sm:block">Zero Hardcoded Data — Pure API-Driven Lookups</p>
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
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
                placeholder="Enter CAS Registry No., CID, or Chemical Name..."
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
            <section className={`p-6 sm:p-8 rounded-3xl border shadow-2xl relative overflow-hidden transition-all ${
              themeMode === 'dark' ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex flex-col lg:flex-row gap-8 items-start">
                <div className="w-full lg:w-5/12 flex flex-col items-center">
                  <div className={`w-full aspect-square max-w-sm rounded-2xl p-6 border flex flex-col items-center justify-center relative group shadow-inner ${
                    themeMode === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-300'
                  }`}>
                    <img
                      src={`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${chemicalData.cid}/PNG?record_type=2d&image_size=300x300`}
                      alt={chemicalData.name}
                      className="w-full h-full object-contain filter drop-shadow-md"
                      onError={(e: any) => {
                        e.target.onerror = null;
                        e.target.src = 'https://via.placeholder.com/300?text=Structure+Image+Unavailable';
                      }}
                    />
                  </div>
                </div>

                <div className="w-full lg:w-7/12 space-y-6">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-indigo-400">
                      {chemicalData.name}
                    </h2>
                    <p className="text-xs text-slate-400 mt-1 font-mono">IUPAC: {chemicalData.iupac}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className={`p-4 rounded-2xl border ${themeMode === 'dark' ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="text-xs text-slate-400 uppercase font-semibold mb-1">CAS Registry No.</div>
                      <div className="text-lg font-mono font-bold text-indigo-400">{chemicalData.cas}</div>
                    </div>
                    <div className={`p-4 rounded-2xl border ${themeMode === 'dark' ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="text-xs text-slate-400 uppercase font-semibold mb-1">Formula</div>
                      <div className="text-lg font-mono font-bold text-cyan-400">{chemicalData.formula}</div>
                    </div>
                    <div className={`p-4 rounded-2xl border ${themeMode === 'dark' ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="text-xs text-slate-400 uppercase font-semibold mb-1">MW</div>
                      <div className="text-lg font-mono font-bold text-emerald-400">{chemicalData.mw}</div>
                    </div>
                    <div className={`p-4 rounded-2xl border ${themeMode === 'dark' ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="text-xs text-slate-400 uppercase font-semibold mb-1">PubChem CID</div>
                      <div className="text-lg font-mono font-bold text-purple-400">{chemicalData.cid}</div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Reaction Pathways */}
            <section className="space-y-6">
              <div className="space-y-8">
                
                {/* UPSTREAM PRECURSORS */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-amber-400">
                    <ArrowDown className="w-3.5 h-3.5" />
                    <span>Upstream Precursors & Reactants</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {chemicalData.previous && chemicalData.previous.length > 0 ? (
                      chemicalData.previous.map((item: any, index: number) => (
                        <div
                          key={index}
                          onClick={() => navigateToChemical(item.cid)}
                          className={`p-5 rounded-2xl border cursor-pointer hover:border-amber-500/50 transition ${
                            themeMode === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                          }`}
                        >
                          <h4 className="text-base font-bold text-slate-100">{item.name}</h4>
                          <p className="text-xs font-mono text-slate-400 mt-1">{item.cas}</p>
                          <div className="mt-3 p-2 rounded-lg bg-slate-950 text-xs text-slate-300">
                            {item.reaction}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-slate-500 italic p-4 rounded-xl border border-slate-800">
                        No direct upstream precursors indexed in PubChem for this CID.
                      </div>
                    )}
                  </div>
                </div>

                {/* DOWNSTREAM PRODUCTS */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
                    <ArrowDown className="w-3.5 h-3.5" />
                    <span>Downstream Derivatives & Products</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {chemicalData.next && chemicalData.next.length > 0 ? (
                      chemicalData.next.map((item: any, index: number) => (
                        <div
                          key={index}
                          onClick={() => navigateToChemical(item.cid)}
                          className={`p-5 rounded-2xl border cursor-pointer hover:border-emerald-500/50 transition ${
                            themeMode === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                          }`}
                        >
                          <h4 className="text-base font-bold text-slate-100">{item.name}</h4>
                          <p className="text-xs font-mono text-slate-400 mt-1">{item.cas}</p>
                          <div className="mt-3 p-2 rounded-lg bg-slate-950 text-xs text-slate-300">
                            {item.reaction}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-slate-500 italic p-4 rounded-xl border border-slate-800">
                        No direct downstream derivatives indexed in PubChem for this CID.
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}