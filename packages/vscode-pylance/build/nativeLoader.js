// Map .node files to our custom output folder, by platform at runtime.

module.exports = function loader() {
    /**@type {string}*/
    const resourcePath = this.resourcePath;
    if (!resourcePath.endsWith('onnxruntime_binding.node')) {
        throw new Error(`Non-ONNX node binding found: ${resourcePath}`);
    }

    return 'module.exports = __non_webpack_require__(`./native/onnxruntime/napi-v3/${process.platform}/${process.arch}/onnxruntime_binding.node`)';
};
