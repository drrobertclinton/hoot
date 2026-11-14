// iOS build fix that must survive `expo prebuild`: Xcode 26 compiles the ExpoModules pods in Swift 6 mode and
// stops on "sending 'emitter' risks causing data races". Pin those pods to Swift 5.
const { withPodfile, withXcodeProject } = require('@expo/config-plugins');

const MARK = '# coressence: ExpoModules pods build in Swift 5 mode';
const SNIPPET = `
    ${MARK}
    installer.pods_project.targets.each do |target|
      next unless target.name.start_with?('ExpoModules')
      target.build_configurations.each do |cfg|
        cfg.build_settings['SWIFT_VERSION'] = '5.0'
      end
    end
`;

// Put app.json's version and build number into the Xcode build settings, so a plain xcodebuild archive is 1.2.0 (4)
// without passing MARKETING_VERSION / CURRENT_PROJECT_VERSION on the command line.
function withVersion(config) {
  return withXcodeProject(config, (cfg) => {
    const configs = cfg.modResults.pbxXCBuildConfigurationSection();
    for (const key of Object.keys(configs)) {
      const bs = configs[key].buildSettings;
      if (!bs || !bs.PRODUCT_BUNDLE_IDENTIFIER) continue;
      bs.MARKETING_VERSION = cfg.version;
      bs.CURRENT_PROJECT_VERSION = (cfg.ios && cfg.ios.buildNumber) || '1';
    }
    return cfg;
  });
}

module.exports = function withCoressenceIos(config) {
  return withPodfile(withVersion(config), (cfg) => {
    const src = cfg.modResults.contents;
    if (src.includes(MARK)) return cfg;
    const hook = /post_install do \|installer\|\n/;
    cfg.modResults.contents = hook.test(src) ? src.replace(hook, (m) => m + SNIPPET) : `${src}\npost_install do |installer|${SNIPPET}end\n`;
    return cfg;
  });
};
