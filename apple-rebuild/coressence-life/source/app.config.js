// Extends app.json. The investor web demo (scripts/build-demo-web.js) is exported with a placeholder base URL
// that the build script turns into a path worked out in the browser, so the export runs from any folder.
module.exports = ({ config }) => {
  if (process.env.CL_DEMO_WEB === '1') {
    config.experiments = { ...(config.experiments || {}), baseUrl: '/__CL_BASE__' };
  }
  return config;
};
