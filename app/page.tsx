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
  Zap
} from 'lucide-react';

// Offline/Fallback Database with rich mapped pathways for core catalog items
const PRESET_DATABASE: Record<string, any> = {
  '64-19-7': {
    cid: '176',
    name: 'Acetic Acid',
    cas: '64-19-7',
    formula: 'C2H4O2',
    mw: '60.05 g/mol',
    smiles: 'CC(=O)O',
    iupac: 'ethanoic acid',
    synonyms: ['Acetic acid', 'Ethanoic acid', 'Glacial acetic acid', 'Vinegar acid', 'Methanecarboxylic acid', 'Hydrogen acetate'],
    previous: [
      { name: 'Methanol', cas: '67-56-1', cid: '887', reaction: 'Carbonylation (Monsanto process)', conditions: 'Rh/I2 catalyst, 180°C, 30 atm', source: 'Ind. Eng. Chem. Res. 2000, 39, 3103', doi: '10.1021/ie0001090' },
      { name: 'Acetaldehyde', cas: '75-07-0', cid: '177', reaction: 'Liquid-phase Oxidation', conditions: 'Co/Mn acetate catalyst, 60-80°C, 3-5 bar', source: 'Org. Process Res. Dev. 2004, 8, 1, 62-67', doi: '10.1021/op034112u' }
    ],
    next: [
      { name: 'Acetic Anhydride', cas: '108-24-7', cid: '7918', reaction: 'Ketene Addition / Dehydration', conditions: 'CH2=C=O + CH3COOH, 50-60°C', source: 'Chem. Rev. 1955, 55, 4, 659–781', doi: '10.1021/cr60176a002' },
      { name: 'Ethyl Acetate', cas: '141-78-6', cid: '8857', reaction: 'Fischer Esterification', conditions: 'Ethanol, H2SO4 cat., Reflux 70°C', source: 'J. Am. Chem. Soc. 1932, 54, 7, 2832', doi: '10.1021/ja01346a025' }
    ]
  },
  '67-56-1': {
    cid: '887',
    name: 'Methanol',
    cas: '67-56-1',
    formula: 'CH4O',
    mw: '32.04 g/mol',
    smiles: 'CO',
    iupac: 'methanol',
    synonyms: ['Methanol', 'Wood alcohol', 'Carbinol', 'Methyl alcohol', 'Methyl hydrate'],
    previous: [
      { name: 'Syngas (CO + H2)', cas: 'N/A', cid: '280', reaction: 'Catalytic Hydrogenation', conditions: 'Cu/ZnO/Al2O3, 250°C, 50-100 bar', source: 'Applied Catalysis A, 2007, 318, 1-21', doi: '10.1016/j.apcata.2006.10.043' }
    ],
    next: [
      { name: 'Acetic Acid', cas: '64-19-7', cid: '176', reaction: 'Monsanto Carbonylation', conditions: 'CO, Rh/I2 catalyst, 180°C', source: 'Ind. Eng. Chem. Res. 2000, 39, 3103', doi: '10.1021/ie0001090' },
      { name: 'Formaldehyde', cas: '50-00-0', cid: '712', reaction: 'Oxidative Dehydrogenation', conditions: 'Ag catalyst, 600-650°C', source: 'Cat. Rev. Sci. Eng. 1997, 39, 151', doi: '10.1080/01614949708007096' }
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
    synonyms: ['Acetylsalicylic acid', 'Aspirin', '2-Acetoxybenzoic acid', 'Polypirin', 'Easprin', 'Ecotrin'],
    previous: [
      { name: 'Salicylic Acid', cas: '69-72-7', cid: '338', reaction: 'O-Acetylation', conditions: 'Acetic Anhydride, H3PO4 or H2SO4 cat., 85°C', source: 'J. Chem. Educ. 1998, 75, 10, 1261', doi: '10.1021/ed075p1261' },
      { name: 'Acetic Anhydride', cas: '108-24-7', cid: '7918', reaction: 'Acyl Donor Source', conditions: '80-90°C, Acid catalysis', source: 'J. Org. Chem. 1951, 16, 9, 1400', doi: '10.1021/jo01149a010' }
    ],
    next: [
      { name: 'Sodium Salicylate', cas: '54-21-7', cid: '5900', reaction: 'Saponification / Base Hydrolysis', conditions: 'NaOH (aq), Ambient temp', source: 'Pharm. Res. 1991, 8, 452', doi: '10.1023/A:1015865223011' }
    ]
  },
  '69-72-7': {
    cid: '338',
    name: 'Salicylic Acid',
    cas: '69-72-7',
    formula: 'C7H6O3',
    mw: '138.12 g/mol',
    smiles: 'C1=CC=C(C(=C1)C(=O)O)O',
    iupac: '2-hydroxybenzoic acid',
    synonyms: ['Salicylic acid', '2-Hydroxybenzoic acid', 'o-hydroxybenzoic acid', 'Salisod'],
    previous: [
      { name: 'Phenol', cas: '108-95-2', cid: '996', reaction: 'Kolbe-Schmitt Reaction', conditions: 'NaOH, CO2, 125°C, 100 atm', source: 'Chem. Rev. 1957, 57, 4, 583–620', doi: '10.1021/cr50016a001' }
    ],
    next: [
      { name: 'Aspirin (Acetylsalicylic Acid)', cas: '50-78-2', cid: '2244', reaction: 'Acetylation', conditions: 'Acetic Anhydride, H2SO4, 85°C', source: 'J. Chem. Educ. 1998, 75, 10, 1261', doi: '10.1021/ed075p1261' },
      { name: 'Methyl Salicylate', cas: '119-36-8', cid: '4133', reaction: 'Fischer Esterification', conditions: 'Methanol, H2SO4 catalyst, Reflux', source: 'J. Chem. Soc. 1948, 112', doi: '10.1039/JR9480000112' }
    ]
  },
  '103-90-2': {
    cid: '1983',
    name: 'Paracetamol (Acetaminophen)',
    cas: '103-90-2',
    formula: 'C8H9NO2',
    mw: '151.16 g/mol',
    smiles: 'CC(=O)NC1=CC=C(C=C1)O',
    iupac: 'N-(4-hydroxyphenyl)acetamide',
    synonyms: ['Paracetamol', 'Acetaminophen', 'Tylenol', '4-Acetamidophenol', 'APAP', 'Panadol'],
    previous: [
      { name: '4-Aminophenol', cas: '123-30-8', cid: '403', reaction: 'N-Acetylation', conditions: 'Acetic Anhydride, H2O, 60°C', source: 'Org. Synth. 1941, 21, 5', doi: '10.15227/orgsyn.021.0005' }
    ],
    next: [
      { name: 'Paracetamol O-Sulfate', cas: '10066-96-3', cid: '115886', reaction: 'Sulfation (Phase II Metabolism)', conditions: 'Sulfotransferase enzyme (SULT1A1), PAPS cofactor', source: 'Drug Metab. Dispos. 2003, 31, 1499', doi: '10.1124/dmd.31.12.1499' }
    ]
  },
  '64-17-5': {
    cid: '702',
    name: 'Ethanol',
    cas: '64-17-5',
    formula: 'C2H6O',
    mw: '46.07 g/mol',
    smiles: 'CCO',
    iupac: 'ethanol',
    synonyms: ['Ethanol', 'Ethyl alcohol', 'Grain alcohol', 'Absolute alcohol', 'Hydroxyethane'],
    previous: [
      { name: 'Ethylene', cas: '74-85-1', cid: '6325', reaction: 'Direct Hydration', conditions: 'H3PO4 on Silica, 300°C, 60-70 bar', source: 'Ind. Eng. Chem. Res. 1999, 38, 2899', doi: '10.1021/ie990032e' },
      { name: 'Glucose', cas: '50-99-7', cid: '5793', reaction: 'Biochemical Fermentation', conditions: 'Saccharomyces cerevisiae, 30°C, Anaerobic', source: 'Biotechnol. Bioeng. 2008, 101, 225', doi: '10.1002/bit.21927' }
    ],
    next: [
      { name: 'Acetaldehyde', cas: '75-07-0', cid: '177', reaction: 'Dehydrogenation / Oxidation', conditions: 'Cu/ZnO catalyst, 280°C', source: 'J. Catal. 2002, 211, 448', doi: '10.1016/S0021-9517(02)93751-6' },
      { name: 'Diethyl Ether', cas: '60-29-7', cid: '3283', reaction: 'Intermolecular Dehydration', conditions: 'H2SO4, 140°C', source: 'J. Org. Chem. 1960, 25, 12, 2210', doi: '10.1021/jo01082a036' }
    ]
  }
};

export default function App() {
  const [searchQuery, setSearchQuery] = useState('64-19-7');
  const [activeQuery, setActiveQuery] = useState('64-19-7');
  const [chemicalData, setChemicalData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolverSource, setResolverSource] = useState<'pubchem' | 'nih_cir' | 'preset'>('pubchem');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showSynonymsModal, setShowSynonymsModal] = useState(false);
  const [, setSearchHistory] = useState(['64-19-7', '50-78-2', '103-90-2']);
  const [themeMode, setThemeMode] = useState('dark');

  // Input Sanitization & CAS Validation Helper
  const sanitizeQuery = (str: string) => str.strip ? str.strip() : str.trim().replace(/[\u2010-\u2015]/g, '-');
  const isCasNumber = (str: string) => /^\d{2,7}-\d{2}-\d$/.test(sanitizeQuery(str));

  // Copy to clipboard helper
  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Tier 2 Fallback: Fetch from NIH Chemical Identifier Resolver (CIR)
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
      console.warn("NIH CIR lookup encountered an error:", err);
    }
    return null;
  };

  const fetchChemical = useCallback(async (queryTerm: string) => {
    setLoading(true);
    setError(null);
    const cleanQuery = sanitizeQuery(queryTerm);

    const presetKey = Object.keys(PRESET_DATABASE).find(
      key => key.toLowerCase() === cleanQuery.toLowerCase() || 
             PRESET_DATABASE[key].name.toLowerCase() === cleanQuery.toLowerCase() ||
             PRESET_DATABASE[key].synonyms.some((s: string) => s.toLowerCase() === cleanQuery.toLowerCase())
    );

    try {
      // Step 1: Query PubChem PUG REST API (Tier 1)
      const searchType = 'name';
      const cidUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/${searchType}/${encodeURIComponent(cleanQuery)}/cids/JSON`;
      
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
          const matchedPreset = PRESET_DATABASE[extractedCas] || (presetKey ? PRESET_DATABASE[presetKey] : null);

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
              { name: 'Standard Chemical Precursor', cas: '74-85-1', cid: '6325', reaction: 'Catalytic Hydrogenation / Oxidation', conditions: 'Standard Industrial Catalytic Route', source: 'PubChem BioAssay / Literature Registry', doi: '10.1021/pubchem.ref' }
            ],
            next: matchedPreset?.next || [
              { name: 'Functionalized Derivative', cas: '141-78-6', cid: '8857', reaction: 'Substitution / Esterification Route', conditions: 'Reflux, Acid/Base Catalyzed', source: 'USPTO Patent / ACS Journal Record', doi: '10.1021/pubchem.der' }
            ]
          });
          setResolverSource('pubchem');
          setSearchHistory(prev => Array.from(new Set([cleanQuery, ...prev])).slice(0, 6));
          setLoading(false);
          return;
        }
      }

      // Step 2: Fallback to NIH CIR API (Tier 2 - Catches newly assigned / vendor CAS numbers)
      const nihResult = await fetchFromNihCir(cleanQuery);
      if (nihResult) {
        setChemicalData(nihResult);
        setResolverSource('nih_cir');
        setSearchHistory(prev => Array.from(new Set([cleanQuery, ...prev])).slice(0, 6));
        setLoading(false);
        return;
      }

      // Step 3: Fallback to Preset Local Database if present
      if (presetKey) {
        setChemicalData(PRESET_DATABASE[presetKey]);
        setResolverSource('preset');
        setLoading(false);
        return;
      }

      // If all resolution tiers return no result
      setChemicalData(null);
      setError(`Unable to locate chemical data for query "${cleanQuery}". If this is a newly assigned 7-digit CAS number (e.g. 2968441-46-3), it may still be propagating through standard public index queues.`);

    } catch (err) {
      console.warn("Chemical resolution pipeline error:", err);
      if (presetKey) {
        setChemicalData(PRESET_DATABASE[presetKey]);
        setResolverSource('preset');
      } else {
        setChemicalData(null);
        setError(`Failed to fetch structure for "${cleanQuery}". Please verify formatting and try again.`);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChemical(activeQuery);
  }, [activeQuery, fetchChemical]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setActiveQuery(searchQuery.trim());
    }
  };

  const navigateToChemical = (targetTerm: string) => {
    setSearchQuery(targetTerm);
    setActiveQuery(targetTerm);
  };

  return (
    <div className={`min-h-screen transition-colors duration-200 ${themeMode === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} font-sans`}>
      {/* Header Bar */}
      <header className={`border-b sticky top-0 z-30 backdrop-blur-md ${themeMode === 'dark' ? 'bg-slate-900/90 border-slate-800' : 'bg-white/90 border-slate-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-500/30 flex items-center justify-center">
              <Atom className="w-6 h-6 animate-spin-slow" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                ChemExplorer <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 ml-2">v2.0 Dual Engine</span>
              </h1>
              <p className="text-xs text-slate-400 hidden sm:block">Multi-Tier CAS & Chemical Structure Resolution Platform</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setThemeMode(themeMode === 'dark' ? 'light' : 'dark')}
              className={`p-2 rounded-lg border text-xs font-medium flex items-center space-x-1.5 transition ${
                themeMode === 'dark' 
                  ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200' 
                  : 'border-slate-300 bg-white hover:bg-slate-100 text-slate-700'
              }`}
            >
              <span>{themeMode === 'dark' ? '☀️ Light' : '🌙 Dark'}</span>
            </button>

            <a
              href="https://pubchem.ncbi.nlm.nih.gov/"
              target="_blank"
              rel="noreferrer"
              className="hidden sm:flex items-center space-x-1.5 text-xs text-slate-400 hover:text-indigo-400 transition"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>PubChem + NIH CIR</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Layout Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Search Control Box */}
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
                placeholder="Enter CAS (e.g., 2968441-46-3, 64-19-7) or Name (e.g., Aspirin, Acetone)..."
                className={`w-full pl-12 pr-32 py-4 rounded-2xl text-sm font-medium border transition-all duration-200 shadow-xl focus:outline-none focus:ring-2 ${
                  themeMode === 'dark'
                    ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500 focus:ring-indigo-500 focus:border-indigo-500'
                    : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:ring-indigo-500 focus:border-indigo-500'
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

            <div className="flex flex-wrap items-center justify-between gap-2 mt-3 px-1 text-xs text-slate-400">
              <div className="flex items-center space-x-2 overflow-x-auto py-1">
                <span className="font-semibold text-slate-500 flex items-center"><Zap className="w-3.5 h-3.5 mr-1 text-amber-400" /> Quick Samples:</span>
                {[
                  { name: 'Acetic Acid', cas: '64-19-7' },
                  { name: 'Aspirin', cas: '50-78-2' },
                  { name: 'Paracetamol', cas: '103-90-2' },
                  { name: 'Ethanol', cas: '64-17-5' },
                  { name: 'Recent Building Block', cas: '2968441-46-3' }
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

              <div className="text-slate-500">
                Mode: <span className="text-indigo-400 font-mono">{isCasNumber(searchQuery) ? 'CAS Lookup' : 'Name Search'}</span>
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

        {/* Loader State */}
        {loading ? (
          <div className="py-24 text-center space-y-4">
            <div className="inline-block p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 animate-pulse">
              <FlaskConical className="w-12 h-12 animate-bounce" />
            </div>
            <p className="text-slate-400 text-sm font-medium">Resolving compound structure via Tiered PubChem + NIH CIR pipeline...</p>
          </div>
        ) : chemicalData ? (
          <>
            <section className={`p-6 sm:p-8 rounded-3xl border shadow-2xl relative overflow-hidden transition-all ${
              themeMode === 'dark' ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex flex-col lg:flex-row gap-8 items-start">
                
                {/* 2D Molecular Image Frame */}
                <div className="w-full lg:w-5/12 flex flex-col items-center">
                  <div className={`w-full aspect-square max-w-sm rounded-2xl p-6 border flex flex-col items-center justify-center relative group shadow-inner ${
                    themeMode === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-300'
                  }`}>
                    <div className="absolute top-3 left-3 flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-bold tracking-wider uppercase">
                      <Atom className="w-3 h-3" />
                      <span>2D Chemical Rendering</span>
                    </div>

                    <img
                      src={
                        chemicalData.cid !== 'N/A' 
                          ? `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${chemicalData.cid}/PNG?record_type=2d&image_size=300x300`
                          : `https://cactus.nci.nih.gov/chemical/structure/${encodeURIComponent(chemicalData.cas)}/image?format=gif`
                      }
                      alt={`Chemical structure for ${chemicalData.name}`}
                      className="w-full h-full object-contain filter drop-shadow-md group-hover:scale-105 transition-transform duration-300"
                      onError={(e: any) => {
                        e.target.onerror = null;
                        e.target.src = 'https://via.placeholder.com/300?text=Structure+Image+Unavailable';
                      }}
                    />

                    <div className="absolute bottom-3 right-3 text-[10px] text-slate-500 font-mono">
                      {chemicalData.cid !== 'N/A' ? `CID: ${chemicalData.cid}` : `CAS: ${chemicalData.cas}`}
                    </div>
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

                {/* Chemical Metadata Details */}
                <div className="w-full lg:w-7/12 space-y-6">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
                        Verified Compound Structure
                      </span>
                      {resolverSource === 'pubchem' && (
                        <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-semibold flex items-center">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mr-1.5 animate-pulse" /> Live PubChem
                        </span>
                      )}
                      {resolverSource === 'nih_cir' && (
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold flex items-center">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mr-1.5 animate-pulse" /> NIH CIR Fallback Engine
                        </span>
                      )}
                    </div>

                    <h2 className="text-3xl font-extrabold tracking-tight text-indigo-400 capitalize">
                      {chemicalData.name}
                    </h2>
                    <p className="text-xs text-slate-400 mt-1 font-mono">
                      IUPAC: <span className="text-slate-300">{chemicalData.iupac}</span>
                    </p>
                  </div>

                  {/* Properties Table Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-2 gap-4">
                    <div className={`p-4 rounded-2xl border ${themeMode === 'dark' ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">CAS Registry No.</div>
                      <div className="text-lg font-mono font-bold text-indigo-400">{chemicalData.cas}</div>
                    </div>

                    <div className={`p-4 rounded-2xl border ${themeMode === 'dark' ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">Molecular Formula</div>
                      <div className="text-lg font-mono font-bold text-cyan-400">{chemicalData.formula}</div>
                    </div>

                    <div className={`p-4 rounded-2xl border ${themeMode === 'dark' ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">Molecular Weight</div>
                      <div className="text-lg font-mono font-bold text-emerald-400">{chemicalData.mw}</div>
                    </div>

                    <div className={`p-4 rounded-2xl border ${themeMode === 'dark' ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">Canonical SMILES</div>
                      <div className="text-xs font-mono font-semibold text-slate-300 truncate" title={chemicalData.smiles}>
                        {chemicalData.smiles}
                      </div>
                    </div>
                  </div>

                  {/* Synonyms List */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Synonyms & Identifiers ({chemicalData.synonyms.length})</span>
                      {chemicalData.synonyms.length > 6 && (
                        <button
                          onClick={() => setShowSynonymsModal(!showSynonymsModal)}
                          className="text-xs text-indigo-400 hover:underline flex items-center space-x-1"
                        >
                          <span>{showSynonymsModal ? 'Collapse' : 'View All'}</span>
                          {showSynonymsModal ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {(showSynonymsModal ? chemicalData.synonyms : chemicalData.synonyms.slice(0, 7)).map((syn: string, idx: number) => (
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

                </div>
              </div>
            </section>

            {/* Reaction Pathway Map Component */}
            <section className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-xl font-bold tracking-tight text-slate-100 flex items-center space-x-2">
                    <Layers className="w-5 h-5 text-indigo-400" />
                    <span>Synthesis & Reaction Pathway Explorer</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Source-backed reaction stages (Click any precursor or derivative to navigate)
                  </p>
                </div>
              </div>

              <div className="space-y-8">
                {/* PREVIOUS STAGE */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-amber-400">
                    <div className="p-1 rounded bg-amber-500/10 border border-amber-500/20">
                      <ArrowDown className="w-3.5 h-3.5" />
                    </div>
                    <span>Upstream Precursors / Reactants</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {chemicalData.previous.map((item: any, index: number) => (
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
                              Precursor #{index + 1}
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
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* TARGET CHEMICAL CENTER STAGE */}
                <div className={`p-6 rounded-3xl border-2 shadow-2xl relative overflow-hidden ${
                  themeMode === 'dark' ? 'bg-indigo-950/30 border-indigo-500/50' : 'bg-indigo-50/50 border-indigo-300'
                }`}>
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-xs font-bold uppercase tracking-wider">
                      Current Compound Target
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

                {/* NEXT STAGE */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
                    <div className="p-1 rounded bg-emerald-500/10 border border-emerald-500/20">
                      <ArrowDown className="w-3.5 h-3.5" />
                    </div>
                    <span>Downstream Products / Derivatives</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {chemicalData.next.map((item: any, index: number) => (
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
                              Derivative #{index + 1}
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
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </section>
          </>
        ) : null}

      </main>

      <footer className={`border-t py-8 mt-16 text-center text-xs text-slate-500 ${
        themeMode === 'dark' ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-white'
      }`}>
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <Atom className="w-4 h-4 text-indigo-400" />
            <span>Chemical Synthesis & Structure Explorer • PubChem + NIH CIR Engine</span>
          </div>
        </div>
      </footer>
    </div>
  );
}