'use strict';

function bocError(code, message, context) {
  return {
    ok: false,
    error: {
      code,
      message,
      context: context || {},
      ts: new Date().toISOString()
    }
  };
}

module.exports = { bocError };
