// CoreBus에 24 엣지 스키마 등록
const { coreBus } = require('./CoreBus.cjs');
const { SCHEMAS } = require('./schemas.cjs');

function registerAllSchemas() {
  Object.keys(SCHEMAS).forEach(function(eventType) {
    coreBus.registerSchema(eventType, SCHEMAS[eventType]);
  });
  return Object.keys(SCHEMAS).length;
}

module.exports = { registerAllSchemas: registerAllSchemas };
