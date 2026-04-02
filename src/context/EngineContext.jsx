import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { FALLBACK_ASSOCS } from "../data/competitionData";
import { FALLBACK_CONST } from "../data/fallbacks";

const EngineContext = createContext();

export function EngineProvider({ children }) {
    const [compTiers, setCompTiers] = useState([]);
    const [assocList, setAssocList] = useState(FALLBACK_ASSOCS);
    const [assocComps, setAssocComps] = useState([]);
    const [vmcuAssocs, setVmcuAssocs] = useState([]);
    const [dbWeights, setDbWeights] = useState(null);
    const [engineConst, setEngineConst] = useState(FALLBACK_CONST);
    const [engineLoading, setEngineLoading] = useState(true);
    const [engineError, setEngineError] = useState(null);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const [tRes, aRes, rRes, wRes, cRes, acRes] = await Promise.all([
                    supabase.from('competition_tiers').select('*').order('cti_value', { ascending: false }),
                    supabase.from('vmcu_associations').select('abbrev, full_name').order('abbrev'),
                    supabase.from('vccl_regions').select('region_name').order('region_code'),
                    supabase.from('domain_weights').select('*'),
                    supabase.from('engine_constants').select('constant_key, value'),
                    supabase.from('association_competitions').select('*').eq('active', true).order('sort_order'),
                ]);

                if (!mounted) return;

                // Log individual query failures — Supabase doesn't throw, it returns { error }
                const queries = { tiers: tRes, assocs: aRes, regions: rRes, weights: wRes, constants: cRes, assocComps: acRes };
                Object.entries(queries).forEach(([name, res]) => {
                    if (res.error) console.error(`Engine data load failed [${name}]:`, res.error.message);
                });

                if (tRes.data?.length) setCompTiers(tRes.data);
                if (aRes.data?.length) setVmcuAssocs(aRes.data);
                if (acRes.data?.length) setAssocComps(acRes.data);

                const aNames = (aRes.data || []).map(a => a.abbrev);
                const rNames = (rRes.data || []).map(r => r.region_name);
                if (aNames.length || rNames.length) {
                    setAssocList([...aNames, ...rNames, 'CV Pathway', 'Premier Cricket', 'Other']);
                }

                if (wRes.data?.length) {
                    const wm = {};
                    wRes.data.forEach(w => {
                        wm[w.role_id] = {
                            t: +w.technical_weight,
                            i: +w.game_iq_weight,
                            m: +w.mental_weight,
                            h: +w.physical_weight,
                            ph: +w.phase_weight
                        };
                    });
                    setDbWeights(wm);
                }

                if (cRes.data?.length) {
                    const cm = {};
                    cRes.data.forEach(c => { cm[c.constant_key] = c.value; });
                    setEngineConst(cm);
                }
            } catch (e) {
                console.error('Failed to load engine data:', e);
                if (mounted) setEngineError(e.message || 'Failed to load engine data');
            } finally {
                if (mounted) setEngineLoading(false);
            }
        })();

        return () => { mounted = false; };
    }, []);

    const value = {
        compTiers,
        assocList,
        assocComps,
        vmcuAssocs,
        dbWeights,
        engineConst,
        engineLoading,
        engineError
    };

    return (
        <EngineContext.Provider value={value}>
            {children}
        </EngineContext.Provider>
    );
}

export function useEngine() {
    return useContext(EngineContext);
}
