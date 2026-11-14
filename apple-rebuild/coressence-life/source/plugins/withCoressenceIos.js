// iOS build fix that must survive `expo prebuild`: Xcode 26 compiles the ExpoModules pods in Swift 6 mode and
// stops on "sending 'emitter' risks causing data races". Pin those pods to Swift 5.
const { withPodfile } = require('@expo/config-plugins');

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

module.exports = function withCoressenceIos(config) {
  return withPodfile(config, (cfg) => {
    const src = cfg.modResults.contents;
    if (src.includes(MARK)) return cfg;
    const hook = /post_install do \|installer\|\n/;
    cfg.modResults.contents = hook.test(src) ? src.replace(hook, (m) => m + SNIPPET) : `${src}\npost_install do |installer|${SNIPPET}end\n`;
    return cfg;
  });
};
