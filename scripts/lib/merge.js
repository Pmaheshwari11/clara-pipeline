export function deepMerge(v1, v2) {
  const merged = { ...v1 };
  for (const key of Object.keys(v2)) {
    const v2Val = v2[key];
    const v1Val = v1[key];
    if (v2Val === null || (Array.isArray(v2Val) && v2Val.length === 0))
      continue;
    if (
      key === "services_supported" &&
      Array.isArray(v2Val) &&
      Array.isArray(v1Val)
    ) {
      merged[key] = v1Val.length >= v2Val.length ? v1Val : v2Val;
      continue;
    }
    if (typeof v2Val === "object" && !Array.isArray(v2Val)) {
      merged[key] = deepMerge(v1Val || {}, v2Val);
    } else {
      merged[key] = v2Val;
    }
  }
  return merged;
}

export function generateChangelog(v1, v2, accountId) {
  const changes = [];
  function compare(obj1, obj2, prefix = "") {
    for (const key of Object.keys(obj2)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      const oldVal = obj1?.[key];
      const newVal = obj2[key];
      if (newVal === null || (Array.isArray(newVal) && newVal.length === 0))
        continue;
      if (typeof newVal === "object" && !Array.isArray(newVal)) {
        compare(oldVal || {}, newVal, fullKey);
      } else if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changes.push({
          field: fullKey,
          from: oldVal ?? null,
          to: newVal,
          reason: "Confirmed during onboarding",
        });
      }
    }
  }
  compare(v1, v2);
  return {
    account_id: accountId,
    updated_at: new Date().toISOString(),
    changes,
  };
}
