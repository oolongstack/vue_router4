function normalizeRouteRecord(record) {
  return {
    path: record.path,
    meta: record.meta || {},
    beforeEnter: record.beforeEnter,
    name: record.name,
    components: {
      default: record.component,
    },
    children: record.children || [],
  };
}

function createRouteRecordMatcher(normalizedRecord, parent) {
  const matcher = {
    path: normalizedRecord.path,
    record: normalizedRecord,
    parent,
    children: [],
  };
  if (parent) {
    parent.children.push(matcher);
  }
  return matcher;
}

function createRouterMatcher(routes) {
  const matchers = [];
  function addRoute(route, parent) {
    const normalizedRecord = normalizeRouteRecord(route);
    if (parent) {
      normalizedRecord.path = parent.path + normalizedRecord.path;
    }
    const matcher = createRouteRecordMatcher(normalizedRecord, parent);
    if (normalizedRecord.children.length) {
      const children = normalizedRecord.children;
      for (let i = 0; i < children.length; i++) {
        addRoute(children[i], matcher);
      }
    }
    matchers.push(matcher);
  }
  routes.forEach((route) => addRoute(route, null));

  function resolve(location) {
    const path = location.path;
    const matched = [];
    let matcher = matchers.find((m) => m.path === path);
    while (matcher) {
      matched.unshift(matcher.record);
      matcher = matcher.parent;
    }
    return {
      path,
      matched,
    };
  }
  return {
    addRoute,
    resolve,
  };
}

export { createRouterMatcher };
