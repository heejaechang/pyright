// Replace onnxruntime/lib/binding.js with a version that points to our custom folder.
// If binding.js changes, we will need to change too.

module.exports = function loader(source) {
    return 'export const binding = __non_webpack_require__(`./native/onnxruntime/napi-v3/${process.platform}/${process.arch}/onnxruntime_binding.node`)';
};
