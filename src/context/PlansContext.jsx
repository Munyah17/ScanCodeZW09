import { createContext, useContext, useEffect, useState } from 'react';

const PlansContext = createContext({ plans: {}, loading: true });

/**
 * Fetches subscription_plans once per app load (not per-page, not per-component)
 * and shares it everywhere pricing is displayed — Landing, Pricing, Settings,
 * Dashboard, the sidebar plan badge. This is the single source of truth: a
 * price edited in the Super Admin Pricing tab is what's charged (see
 * api/_utils/get-plan.js) AND what every page displays, from one request.
 */
export function PlansProvider({ children }) {
  const [plans, setPlans] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/plans/list')
      .then(r => r.json())
      .then(data => {
        const byId = {};
        for (const p of data.plans ?? []) byId[p.id] = p;
        setPlans(byId);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return <PlansContext.Provider value={{ plans, loading }}>{children}</PlansContext.Provider>;
}

/** Returns { plans: { [planId]: row }, loading }. Look up a specific plan with plans['starter']. */
export const usePlans = () => useContext(PlansContext);

export function formatPlanPrice(plan, fallback = '—') {
  if (!plan || plan.price_usd == null) return fallback;
  return `$${Number(plan.price_usd).toFixed(2)}`;
}
