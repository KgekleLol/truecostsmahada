(function () {
  "use strict";

  const CONFIDENCE_THRESHOLD = 0.65;
  const ERROR_MESSAGE = "Ada kesalahan, silahkan coba lagi";

  let runtimeInitialized = false;
  if (window.Module) {
    const previousRuntimeCallback = window.Module.onRuntimeInitialized;
    window.Module.onRuntimeInitialized = function () {
      runtimeInitialized = true;
      if (typeof previousRuntimeCallback === "function") previousRuntimeCallback();
    };
  }

  class EdgeImpulseClassifier {
    async init() {
      if (!runtimeInitialized && window.Module && window.Module.calledRun) {
        runtimeInitialized = true;
      }
      if (!runtimeInitialized) {
        await new Promise((resolve, reject) => {
          const previousCallback = window.Module.onRuntimeInitialized;
          window.Module.onRuntimeInitialized = function () {
            runtimeInitialized = true;
            if (typeof previousCallback === "function") previousCallback();
            resolve();
          };
          window.Module.onAbort = reject;
        });
      }
      const result = window.Module.init();
      if (typeof result === "number" && result !== 0) {
        throw new Error(`Inisialisasi model gagal (${result})`);
      }
    }

    getProperties() {
      return convertEmbindObject(window.Module.get_properties(), window.Module.emcc_classification_properties_t.prototype);
    }

    classify(rawData) {
      const typedArray = new Float32Array(rawData);
      const pointer = window.Module._malloc(typedArray.byteLength);
      window.Module.HEAPU8.set(new Uint8Array(typedArray.buffer), pointer);
      const result = window.Module.run_classifier(pointer, typedArray.length, false);
      window.Module._free(pointer);
      if (result.result !== 0) throw new Error(`Inferensi gagal (${result.result})`);
      return fillResult(result);
    }
  }

  function convertEmbindObject(value, prototype) {
    const object = {};
    for (const key of Object.getOwnPropertyNames(prototype)) {
      const descriptor = Object.getOwnPropertyDescriptor(prototype, key);
      if (descriptor && typeof descriptor.get === "function") object[key] = value[key];
    }
    return object;
  }

  function fillResult(result) {
    const properties = window.Module.get_properties();
    const output = { anomaly: result.anomaly, results: [] };
    for (let index = 0; index < result.size(); index += 1) {
      const item = result.get(index);
      output.results.push({ label: item.label, value: item.value });
      item.delete();
    }
    result.delete();
    return output;
  }

  window.EdgeImpulseClassifier = window.EdgeImpulseClassifier || EdgeImpulseClassifier;

  class WasmClassifier {
    constructor(classifier) {
      this.classifier = classifier;
      this.canvas = document.createElement("canvas");
      this.width = 96;
      this.height = 96;
    }

    async init() {
      await this.classifier.init();
      const properties = this.classifier.getProperties();
      const sampleCount = Number(properties.frame_sample_count) || 9216;
      const inferredSide = Math.round(Math.sqrt(sampleCount));
      this.width = Number(properties.image_input_width) || inferredSide || 96;
      this.height = Number(properties.image_input_height) || inferredSide || 96;
      this.canvas.width = this.width;
      this.canvas.height = this.height;
    }

    async classify(videoElement) {
      if (!videoElement || videoElement.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        throw new Error("Frame kamera belum siap.");
      }
      const context = this.canvas.getContext("2d", { willReadFrequently: true });
      if (!context || !videoElement.videoWidth || !videoElement.videoHeight) {
        throw new Error("Canvas kamera tidak tersedia.");
      }

      const sourceRatio = videoElement.videoWidth / videoElement.videoHeight;
      const targetRatio = this.width / this.height;
      const cropWidth = sourceRatio > targetRatio
        ? videoElement.videoHeight * targetRatio
        : videoElement.videoWidth;
      const cropHeight = sourceRatio > targetRatio
        ? videoElement.videoHeight
        : videoElement.videoWidth / targetRatio;

      context.drawImage(
        videoElement,
        (videoElement.videoWidth - cropWidth) / 2,
        (videoElement.videoHeight - cropHeight) / 2,
        cropWidth,
        cropHeight,
        0,
        0,
        this.width,
        this.height,
      );

      const pixels = context.getImageData(0, 0, this.width, this.height).data;
      const features = new Array(this.width * this.height);
      for (let pixel = 0, feature = 0; pixel < pixels.length; pixel += 4, feature += 1) {
        features[feature] = (pixels[pixel] << 16) | (pixels[pixel + 1] << 8) | pixels[pixel + 2];
      }
      return this.classifier.classify(features);
    }
  }

  function normalizeResults(prediction) {
    return [...(prediction && prediction.results ? prediction.results : [])]
      .map((result) => ({
        label: String(result.label || "").trim(),
        value: Number(result.value),
      }))
      .filter((result) => Number.isFinite(result.value))
      .sort((first, second) => second.value - first.value);
  }

  let runtimePromise = null;
  let classifierPromise = null;
  let stream = null;

  function loadScript(id, source) {
    const existing = document.getElementById(id);
    if (existing && existing.dataset.loaded === "true") return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = existing || document.createElement("script");
      script.id = id;
      script.src = source;
      script.async = false;
      script.onload = () => {
        script.dataset.loaded = "true";
        resolve();
      };
      script.onerror = () => reject(new Error(`Gagal memuat ${source}`));
      if (!existing) document.head.appendChild(script);
    });
  }

  async function initialize() {
    if (classifierPromise) return classifierPromise;
    classifierPromise = (async () => {
      window.Module = window.Module || {};
      window.Module.locateFile = (path) =>
        path.endsWith(".wasm") ? "./edge-impulse-standalone.wasm" : path;
      await loadScript("truecost-wasm-runtime", "./edge-impulse-standalone.js");
      if (typeof window.EdgeImpulseClassifier !== "function") {
        throw new Error("Runtime model tidak tersedia.");
      }
      const classifier = new WasmClassifier(new window.EdgeImpulseClassifier());
      await classifier.init();
      return classifier;
    })();
    return classifierPromise;
  }

  function startCamera(videoElement) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return Promise.reject(new Error("Kamera tidak tersedia pada perangkat ini."));
    }
    stopCamera();
    return navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 720 },
        height: { ideal: 1280 },
      },
      audio: false,
    }).then((nextStream) => {
      stream = nextStream;
      videoElement.srcObject = stream;
      return videoElement.play().catch(() => undefined);
    });
  }

  function stopCamera(videoElement) {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      stream = null;
    }
    if (videoElement) videoElement.srcObject = null;
  }

  async function captureAndClassify(videoElement) {
    const classifier = await initialize();
    const results = normalizeResults(await classifier.classify(videoElement));
    const topResult = results[0];
    const label = topResult ? topResult.label.toLowerCase() : "";
    if (!topResult || label === "unknown" || topResult.value < CONFIDENCE_THRESHOLD) {
      throw new Error(ERROR_MESSAGE);
    }
    return {
      label: topResult.label,
      confidence: topResult.value,
      results,
    };
  }

  window.TrueCostAIClassifier = Object.freeze({
    CONFIDENCE_THRESHOLD,
    ERROR_MESSAGE,
    initialize,
    startCamera,
    stopCamera,
    captureAndClassify,
  });
})();
