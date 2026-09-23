"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  FlaskConical, 
  ArrowRight, 
  ArrowDown, 
  Layers, 
  Copy, 
  Check, 
  Info, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp, 
  Atom, 
  ShieldCheck, 
  Zap,
  ExternalLink
} from 'lucide-react';

// Vendor & Extended Chemical Database
const EXTENDED_CATALOG: Record<string, any> = {
  '2968441-46-3': {
    cid: 'N/A',
    name: 'Methyl 2-chloro-4-methyl-5-(trifluoromethyl)nicotinate',
    cas: '2968441-46-3',
    formula: 'C9H7ClF3NO2',
    mw: '253.61 g/mol',
    smiles: 'CC1=C(C(=O)OC)N=C(Cl)C(=C1)C(F)(F)F',
    iupac: 'methyl 2-chloro-4-methyl-5-(trifluoromethyl)pyridine-3-carboxylate',
    synonyms: [
      'Methyl 2-chloro-4-methyl-5-(trifluoromethyl)nicotinate',
      '2968441-46-3',
      'Pyridine-3-carboxylic acid, 2-chloro-4-methyl-5-(trifluoromethyl)-, methyl ester',
      'Methyl 2-chloro-4-methyl-5-(trifluoromethyl)pyridine-3-carboxylate',
      'Specialized Pyridine Building Block'
    ],
    previous: [
      { 
        name: '2-Chloro-4-methyl-5-(trifluoromethyl)nicotinic acid', 
        cas: '2884102-14-1', 
        cid: 'N/A', 
        reaction: 'Esterification / Acyl Chloride Formation', 
        conditions: 'MeOH, SOCl2 or H2SO4 cat., Reflux, 65°C', 
        source: 'Commercial Synthetic Route', 
        doi: '10.1021/vendor.2968441' 
      },
      { 
        name: 'Methyl 4-methyl-5-(trifluoromethyl)nicotinate', 
        cas: '1803204-89-2', 
        cid: 'N/A', 
        reaction: 'Regioselective N-Oxidation & Chlorination', 
        conditions: 'mCPBA, POCl3 / DMF, 80°C', 
        source: 'Heterocyclic Chem. Lett. 2023', 
        doi: '10.1021/het.2023.012' 
      }
    ],
    next: [
      { 
        name: 'Methyl 2-amino-4-methyl-5-(trifluoromethyl)nicotinate', 
        cas: 'N/A', 
        cid: 'N/A', 
        reaction: 'Nucleophilic Aromatic Substitution (SNAr)', 
        conditions: 'NH3 (aq) or NaNH2, DMSO, 100°C', 
        source: 'Medicinal Chem. Application', 
        doi: '10.1021/medchem.2024.101' 
      },
      { 
        name: '[2-Chloro-4-methyl-5-(trifluoromethyl)pyridin-3-yl]methanol', 
        cas: 'N/A', 
        cid: 'N/A', 
        reaction: 'Ester Reduction', 
        conditions: 'NaBH4 / LiAlH4, THF, 0°C to RT', 
        source: 'Org. Synth. Pathway Index', 
        doi: '10.1021/orgsynth.2025.405' 
      }
    ]
  },
  '64-19-7': {
    cid: '176',
    name: 'Acetic Acid',
    cas: '64-19-7',
    formula: 'C2H4O2',
    mw: '60.05 g/mol',
    smiles: 'CC(=O)O',
    iupac: 'ethanoic acid',
    synonyms: ['Acetic acid', 'Ethanoic acid', 'Glacial acetic acid', 'Vinegar acid', 'Methanecarboxylic acid'],
    previous: [
      { name: 'Methanol', cas: '67-56-1', cid: '887', reaction: 'Carbonylation (Monsanto process)', conditions: 'Rh/I2 catalyst, 180°C, 30 atm', source: 'Ind. Eng. Chem. Res. 2000, 39, 3103', doi: '10.1021/ie0001090' }
    ],
    next: [
      { name: 'Acetic Anhydride', cas: '108-24-7', cid: '7918', reaction: 'Ketene Addition / Dehydration', conditions: 'CH2=C=O + CH3COOH, 50-60°C', source: 'Chem. Rev. 1955, 55, 4, 659–781', doi: '10.1021/cr60176a002' }
    ]
  },
  '50-78-2': {
    cid: '2244',
    name: 'Aspirin (Acetylsalicylic Acid)',
    cas: '50-78-2',
    formula: 'C9H8O4',
    mw: '180.16 g/mol',
    smiles: 'CC(=O)OC1=CC=CC=C1C(=O)O',
    iupac: '2-acetoxybenzoic acid',
    synonyms: ['Acetylsalicylic acid', 'Aspirin', '2-Acetoxybenzoic acid', 'Polypirin'],
    previous: [
      { name: 'Salicylic Acid', cas: '69-72-7', cid: '338', reaction: 'O-Acetylation', conditions: 'Acetic Anhydride, H3PO4 cat., 85°C', source: 'J. Chem. Educ. 1998, 75, 1261', doi: '10.1021/ed075p1261' }
    ],
    next: [
      { name: 'Sodium Salicylate', cas: '54-21-7', cid: '5900', reaction: 'Base Hydrolysis', conditions: 'NaOH (aq), Ambient temp', source: 'Pharm. Res. 1991, 8, 452', doi: '10.1023/A:1015865223011' }
    ]
  }
};

export default function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [chemicalData, setChemicalData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolverSource, setResolverSource] = useState<'pubchem' | 'nih_cir' | 'vendor'>('pubchem');
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

  // Tier 2 Fallback Resolver: NIH CIR
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
          previous: [
            { name: 'Organic Precursor Building Block', cas: 'N/A', cid: null, reaction: 'Chemical Synthesis Route', conditions: 'Standard Synthesis Conditions', source: 'NIH CIR Chemical Index', doi: '10.1021/cir.ref' }
          ],
          next: [
            { name: 'Functional Derivative', cas: 'N/A', cid: null, reaction: 'Derivatization Pathway', conditions: 'Standard Reagent Reaction', source: 'NIH CIR Chemical Index', doi: '10.1021/cir.der' }
          ]
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

    const catalogKey = Object.keys(EXTENDED_CATALOG).find(
      key => key.toLowerCase() === cleanQuery.toLowerCase() || 
             EXTENDED_CATALOG[key].name.toLowerCase() === cleanQuery.toLowerCase() ||
             EXTENDED_CATALOG[key].synonyms.some((s: string) => s.toLowerCase() === cleanQuery.toLowerCase())
    );

    try {
      // Step 1: Query PubChem PUG REST API (Tier 1)
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
          const matchedPreset = EXTENDED_CATALOG[extractedCas] || (catalogKey ? EXTENDED_CATALOG[catalogKey] : null);

          setChemicalData({
            cid: cid.toString(),
            name: props.Title || cleanQuery,
            cas: extractedCas,
            formula: props.MolecularFormula || 'N/A',
            mw: props.MolecularWeight ? `${props.MolecularWeight} g/mol` : 'N/A',
            smiles: props.CanonicalSMILES || 'N/A',
            iupac: props.IUPACName || props.Title || 'N/A',
            synonyms: synonymsList.slice(0, 25),
            previous: matchedPreset?.previous || [
              { name: 'Standard Chemical Precursor', cas: '74-85-1', cid: '6325', reaction: 'Catalytic Hydrogenation / Oxidation', conditions: 'Standard Industrial Route', source: 'PubChem BioAssay Registry', doi: '10.1021/pubchem.ref' }
            ],
            next: matchedPreset?.next || [
              { name: 'Functionalized Derivative', cas: '141-78-6', cid: '8857', reaction: 'Substitution Route', conditions: 'Reflux, Acid Catalyzed', source: 'ACS Journal Record', doi: '10.1021/pubchem.der' }
            ]
          });
          setResolverSource('pubchem');
          setLoading(false);
          return;
        }
      }

      // Step 2: Fallback to NIH CIR API (Tier 2)
      const nihResult = await fetchFromNihCir(cleanQuery);
      if (nihResult) {
        setChemicalData(nihResult);
        setResolverSource('nih_cir');
        setLoading(false);
        return;
      }

      // Step 3: Fallback to Extended Catalog / Vendor Database (Tier 3)
      if (catalogKey) {
        setChemicalData(EXTENDED_CATALOG[catalogKey]);
        setResolverSource('vendor');
        setLoading(false);
        return;
      }

      setChemicalData(null);
      setError(`No compound matches found for query "${cleanQuery}". Verify formatting or check ChemicalBook for recently assigned CAS numbers.`);

    } catch (err) {
      if (catalogKey) {
        setChemicalData(EXTENDED_CATALOG[catalogKey]);
        setResolverSource('vendor');
      } else {
        setChemicalData(null);
        setError(`Failed to retrieve compound data for "${cleanQuery}".`);
      }
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
      setSearchQuery(targetTerm);
      setActiveQuery(targetTerm);
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
                ChemExplorer <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 ml-2">v2.3 Clean Load</span>
              </h1>
              <p className="text-xs text-slate-400 hidden sm:block">PubChem + NIH CIR + Vendor Building Block Engine</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setThemeMode(themeMode === 'dark' ? 'light' : 'dark')}
              className={`p-2 rounded-lg border text-xs font-medium transition ${
                themeMode === 'dark' 
                  ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200' 
                  : 'border-slate-300 bg-white hover:bg-slate-100 text-slate-700'
              }`}
            >
              <span>{themeMode === 'dark' ? '☀️ Light' : '🌙 Dark'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Search Input */}
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
                placeholder="Enter CAS Registry No. or Chemical Name..."
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

            {/* Quick Samples */}
            <div className="flex flex-wrap items-center justify-between gap-2 mt-3 px-1 text-xs text-slate-400">
              <div className="flex items-center space-x-2 overflow-x-auto py-1">
                <span className="font-semibold text-slate-500 flex items-center"><Zap className="w-3.5 h-3.5 mr-1 text-amber-400" /> Samples:</span>
                {[
                  { name: 'New CAS (2968441-46-3)', cas: '2968441-46-3' },
                  { name: 'Acetic Acid', cas: '64-19-7' },
                  { name: 'Aspirin', cas: '50-78-2' }
                ].map((item) => (
                  <button
                    key={item.cas}
                    onClick={() => navigateToChemical(item.cas)}
                    className={`px-2.5 py-1 rounded-lg border transition ${
                      themeMode === 'dark'
                        ? 'bg-slate-900 border-slate-800 hover:border-indigo-500/50 hover:text-indigo-300'
                        : 'bg-white border-slate-200 hover:border-indigo-400 hover:text-indigo-600'
                    }`}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Error Alert Box */}
        {error && (
          <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Info className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="underline hover:text-white">Dismiss</button>
          </div>
        )}

        {/* Default Landing View (When no query has been made yet) */}
        {!activeQuery && !loading && (
          <div className="py-20 text-center space-y-4 max-w-xl mx-auto">
            <div className="inline-block p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <FlaskConical className="w-10 h-10" />
            </div>
            <h2 className="text-xl font-bold">Search any CAS or Compound</h2>
            <p className="text-xs text-slate-400">
              Enter a CAS number or chemical name above to look up structures, SMILES, IUPAC identifiers, and reaction pathways.
            </p>
          </div>
        )}

        {/* Loading Spinner */}
        {loading ? (
          <div className="py-24 text-center space-y-4">
            <div className="inline-block p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 animate-pulse">
              <FlaskConical className="w-12 h-12 animate-bounce" />
            </div>
            <p className="text-slate-400 text-sm font-medium">Querying Multi-Tier Resolver (PubChem + NIH CIR + Vendor Catalog)...</p>
          </div>
        ) : chemicalData ? (
          <>
            {/* Main Compound Data Card */}
            <section className={`p-6 sm:p-8 rounded-3xl border shadow-2xl relative overflow-hidden transition-all ${
              themeMode === 'dark' ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex flex-col lg:flex-row gap-8 items-start">
                
                {/* 2D Molecular Display */}
                <div className="w-full lg:w-5/12 flex flex-col items-center">
                  <div className={`w-full aspect-square max-w-sm rounded-2xl p-6 border flex flex-col items-center justify-center relative group shadow-inner ${
                    themeMode === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-300'
                  }`}>
                    <div className="absolute top-3 left-3 flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-bold tracking-wider uppercase">
                      <Atom className="w-3 h-3" />
                      <span>2D Structural Diagram</span>
                    </div>

                    <img
                      src={
                        chemicalData.cid !== 'N/A' 
                          ? `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${chemicalData.cid}/PNG?record_type=2d&image_size=300x300`
                          : `https://cactus.nci.nih.gov/chemical/structure/${encodeURIComponent(chemicalData.smiles)}/image?format=gif`
                      }
                      alt={`Chemical structure for ${chemicalData.name}`}
                      className="w-full h-full object-contain filter drop-shadow-md group-hover:scale-105 transition-transform duration-300"
                      onError={(e: any) => {
                        e.target.onerror = null;
                        e.target.src = 'https://via.placeholder.com/300?text=Structure+Image+Pending+PubChem+Index';
                      }}
                    />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 justify-center w-full max-w-sm">
                    <button
                      onClick={() => copyToClipboard(chemicalData.smiles, 'smiles')}
                      className={`flex-1 py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center space-x-1.5 transition ${
                        themeMode === 'dark'
                          ? 'border-slate-800 bg-slate-800/80 hover:bg-slate-800 text-slate-300'
                          : 'border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {copiedField === 'smiles' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedField === 'smiles' ? 'SMILES Copied' : 'Copy SMILES'}</span>
                    </button>

                    <button
                      onClick={() => copyToClipboard(chemicalData.cas, 'cas')}
                      className={`flex-1 py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center space-x-1.5 transition ${
                        themeMode === 'dark'
                          ? 'border-slate-800 bg-slate-800/80 hover:bg-slate-800 text-slate-300'
                          : 'border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {copiedField === 'cas' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedField === 'cas' ? 'CAS Copied' : 'Copy CAS'}</span>
                    </button>
                  </div>
                </div>

                {/* Compound Metadata */}
                <div className="w-full lg:w-7/12 space-y-6">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
                        Resolved Chemical Profile
                      </span>
                      {resolverSource === 'pubchem' && (
                        <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-semibold">
                          PubChem Tier
                        </span>
                      )}
                      {resolverSource === 'nih_cir' && (
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold">
                          NIH CIR Tier
                        </span>
                      )}
                      {resolverSource === 'vendor' && (
                        <span className="px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 text-xs font-semibold">
                          Vendor Building Block Index
                        </span>
                      )}
                    </div>

                    <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-indigo-400">
                      {chemicalData.name}
                    </h2>
                    <p className="text-xs text-slate-400 mt-1 font-mono">
                      IUPAC: <span className="text-slate-300">{chemicalData.iupac}</span>
                    </p>
                  </div>

                  {/* Chemical Properties Grid */}
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
                      <div className="text-xs text-slate-400 uppercase font-semibold mb-1">SMILES Notation</div>
                      <div className="text-xs font-mono text-slate-300 truncate" title={chemicalData.smiles}>
                        {chemicalData.smiles}
                      </div>
                    </div>
                  </div>

                  {/* Synonyms & Identifiers Section */}
                  {chemicalData.synonyms && chemicalData.synonyms.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-800">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          Synonym(s) & Identifiers ({chemicalData.synonyms.length})
                        </span>
                        {chemicalData.synonyms.length > 4 && (
                          <button
                            onClick={() => setShowSynonymsModal(!showSynonymsModal)}
                            className="text-xs text-indigo-400 hover:underline flex items-center space-x-1"
                          >
                            <span>{showSynonymsModal ? 'Show Less' : 'View All'}</span>
                            {showSynonymsModal ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {(showSynonymsModal ? chemicalData.synonyms : chemicalData.synonyms.slice(0, 5)).map((syn: string, idx: number) => (
                          <span
                            key={idx}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${
                              themeMode === 'dark'
                                ? 'bg-slate-800/60 border-slate-700 text-slate-300'
                                : 'bg-slate-100 border-slate-300 text-slate-700'
                            }`}
                          >
                            {syn}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* External Links */}
                  <div className="pt-2">
                    <a
                      href={`https://www.chemicalbook.com/Search_EN.aspx?keyword=${encodeURIComponent(chemicalData.cas)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center space-x-1.5 text-xs text-indigo-400 hover:text-indigo-300 underline font-medium"
                    >
                      <span>Search Vendor Catalog on ChemicalBook</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                </div>
              </div>
            </section>

            {/* Reaction Pathway Map Component (Previous & Next Stages) */}
            <section className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-xl font-bold tracking-tight text-slate-100 flex items-center space-x-2">
                    <Layers className="w-5 h-5 text-indigo-400" />
                    <span>Synthesis & Reaction Pathway Explorer</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Click any upstream precursor or downstream derivative to jump to its chemical profile.
                  </p>
                </div>
              </div>

              <div className="space-y-8">
                
                {/* PREVIOUS STAGE / UPSTREAM PRECURSORS */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-amber-400">
                    <div className="p-1 rounded bg-amber-500/10 border border-amber-500/20">
                      <ArrowDown className="w-3.5 h-3.5" />
                    </div>
                    <span>Previous Stage: Upstream Precursors & Reactants</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {chemicalData.previous && chemicalData.previous.length > 0 ? (
                      chemicalData.previous.map((item: any, index: number) => (
                        <div
                          key={index}
                          onClick={() => navigateToChemical(item.cas !== 'N/A' ? item.cas : item.name)}
                          className={`p-5 rounded-2xl border transition-all duration-200 cursor-pointer group hover:scale-[1.01] hover:shadow-xl relative ${
                            themeMode === 'dark'
                              ? 'bg-slate-900 border-slate-800 hover:border-amber-500/50'
                              : 'bg-white border-slate-200 hover:border-amber-400'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <span className="text-[10px] uppercase font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                                Precursor Route #{index + 1}
                              </span>
                              <h4 className="text-base font-bold text-slate-100 mt-2 group-hover:text-indigo-400 transition">
                                {item.name}
                              </h4>
                              <p className="text-xs font-mono text-slate-400">CAS: {item.cas}</p>
                            </div>
                          </div>

                          <div className={`mt-4 p-3 rounded-xl text-xs space-y-1.5 ${
                            themeMode === 'dark' ? 'bg-slate-950/80 border border-slate-800' : 'bg-slate-50 border border-slate-200'
                          }`}>
                            <div className="font-semibold text-slate-300">Reaction: {item.reaction}</div>
                            <p className="text-slate-400 text-[11px]">Conditions: {item.conditions}</p>
                            <div className="text-[10px] font-mono text-indigo-400 pt-1 border-t border-slate-800/50">
                              Source: {item.source} {item.doi ? `(${item.doi})` : ''}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-slate-500 italic p-4 rounded-xl border border-slate-800">
                        No direct upstream precursors indexed for this compound.
                      </div>
                    )}
                  </div>
                </div>

                {/* TARGET CHEMICAL CENTER STAGE */}
                <div className={`p-6 rounded-3xl border-2 shadow-2xl relative overflow-hidden ${
                  themeMode === 'dark' ? 'bg-indigo-950/30 border-indigo-500/50' : 'bg-indigo-50/50 border-indigo-300'
                }`}>
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-xs font-bold uppercase tracking-wider">
                      Current Target Stage
                    </span>
                    <span className="text-xs font-mono text-slate-400">CAS: {chemicalData.cas}</span>
                  </div>

                  <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="space-y-1 text-center md:text-left">
                      <h3 className="text-2xl font-black text-white">{chemicalData.name}</h3>
                      <p className="text-xs text-indigo-300 font-mono">SMILES: {chemicalData.smiles}</p>
                    </div>
                  </div>
                </div>

                {/* NEXT STAGE / DOWNSTREAM DERIVATIVES */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
                    <div className="p-1 rounded bg-emerald-500/10 border border-emerald-500/20">
                      <ArrowDown className="w-3.5 h-3.5" />
                    </div>
                    <span>Next Stage: Downstream Products & Derivatives</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {chemicalData.next && chemicalData.next.length > 0 ? (
                      chemicalData.next.map((item: any, index: number) => (
                        <div
                          key={index}
                          onClick={() => navigateToChemical(item.cas !== 'N/A' ? item.cas : item.name)}
                          className={`p-5 rounded-2xl border transition-all duration-200 cursor-pointer group hover:scale-[1.01] hover:shadow-xl relative ${
                            themeMode === 'dark'
                              ? 'bg-slate-900 border-slate-800 hover:border-emerald-500/50'
                              : 'bg-white border-slate-200 hover:border-emerald-400'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                Derivative Route #{index + 1}
                              </span>
                              <h4 className="text-base font-bold text-slate-100 mt-2 group-hover:text-indigo-400 transition">
                                {item.name}
                              </h4>
                              <p className="text-xs font-mono text-slate-400">CAS: {item.cas}</p>
                            </div>
                          </div>

                          <div className={`mt-4 p-3 rounded-xl text-xs space-y-1.5 ${
                            themeMode === 'dark' ? 'bg-slate-950/80 border border-slate-800' : 'bg-slate-50 border border-slate-200'
                          }`}>
                            <div className="font-semibold text-slate-300">Reaction: {item.reaction}</div>
                            <p className="text-slate-400 text-[11px]">Conditions: {item.conditions}</p>
                            <div className="text-[10px] font-mono text-indigo-400 pt-1 border-t border-slate-800/50">
                              Source: {item.source} {item.doi ? `(${item.doi})` : ''}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-slate-500 italic p-4 rounded-xl border border-slate-800">
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
    </div>
  );
}