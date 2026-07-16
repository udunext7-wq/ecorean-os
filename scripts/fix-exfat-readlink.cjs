// D: 드라이브(exFAT)는 심볼릭 링크를 지원하지 않아 Windows에서 fs.readlink가
// EINVAL("링크 아님") 대신 EISDIR을 반환한다. webpack/enhanced-resolve는 EINVAL만
// "심볼릭 링크 아님"으로 취급하므로 빌드가 깨진다. 여기서 errno를 교정한다.
// 사용: NODE_OPTIONS=--require <이 파일> (scripts/run-next.mjs 가 자동 주입)
'use strict';
const fs = require('fs');

function fixErr(err) {
  if (err && err.code === 'EISDIR') {
    err.code = 'EINVAL';
    err.errno = -4071; // UV_EINVAL (win32)
  }
  return err;
}

const origReadlink = fs.readlink;
fs.readlink = function (path, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = undefined;
  }
  return origReadlink.call(fs, path, options, function (err, result) {
    callback(fixErr(err), result);
  });
};

const origReadlinkSync = fs.readlinkSync;
fs.readlinkSync = function (path, options) {
  try {
    return origReadlinkSync.call(fs, path, options);
  } catch (err) {
    throw fixErr(err);
  }
};

const origPromises = fs.promises.readlink;
fs.promises.readlink = async function (path, options) {
  try {
    return await origPromises.call(fs.promises, path, options);
  } catch (err) {
    throw fixErr(err);
  }
};
