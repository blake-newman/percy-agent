this.PercyAgent = (function () {
  'use strict';

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  function _defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  function _createClass(Constructor, protoProps, staticProps) {
    if (protoProps) _defineProperties(Constructor.prototype, protoProps);
    if (staticProps) _defineProperties(Constructor, staticProps);
    return Constructor;
  }

  function _defineProperty(obj, key, value) {
    if (key in obj) {
      Object.defineProperty(obj, key, {
        value: value,
        enumerable: true,
        configurable: true,
        writable: true
      });
    } else {
      obj[key] = value;
    }

    return obj;
  }

  var Constants = function Constants() {
    _classCallCheck(this, Constants);
  };

  _defineProperty(Constants, "PORT", 5338);

  _defineProperty(Constants, "NETWORK_IDLE_TIMEOUT", 50);

  _defineProperty(Constants, "SNAPSHOT_PATH", '/percy/snapshot');

  _defineProperty(Constants, "STOP_PATH", '/percy/stop');

  _defineProperty(Constants, "HEALTHCHECK_PATH", '/percy/healthcheck');

  var PercyAgentClient =
  /*#__PURE__*/
  function () {
    function PercyAgentClient(agentHost, xhr) {
      _classCallCheck(this, PercyAgentClient);

      _defineProperty(this, "xhr", void 0);

      _defineProperty(this, "agentHost", void 0);

      _defineProperty(this, "agentConnected", false);

      this.agentHost = agentHost;
      this.xhr = new xhr() || new XMLHttpRequest();
      this.healthCheck();
    }

    _createClass(PercyAgentClient, [{
      key: "post",
      value: function post(path, data) {
        if (!this.agentConnected) {
          console.warn('percy agent not started.');
          return;
        }

        this.xhr.open('post', "".concat(this.agentHost).concat(path), false); // synchronous request

        this.xhr.setRequestHeader('Content-Type', 'application/json');
        this.xhr.send(JSON.stringify(data));
      }
    }, {
      key: "healthCheck",
      value: function healthCheck() {
        var _this = this;

        try {
          this.xhr.open('get', "".concat(this.agentHost).concat(Constants.HEALTHCHECK_PATH), false);

          this.xhr.onload = function () {
            if (_this.xhr.status === 200) {
              _this.agentConnected = true;
            }
          };

          this.xhr.send();
        } catch (_unused) {
          this.agentConnected = false;
        }
      }
    }]);

    return PercyAgentClient;
  }();

  var DATA_ATTRIBUTE = 'data-percy-cssom-serialized'; // Take all the CSS created in the CSS Object Model (CSSOM), and inject it
  // into the DOM so Percy can render it safely in our browsers.
  // Design doc:
  // https://docs.google.com/document/d/1Rmm8osD-HwSHRpb8pQ_1wLU09XeaCV5AqMtQihk_BmM/edit

  function serializeCssOm(document) {
    [].slice.call(document.styleSheets).forEach(function (styleSheet) {
      // Make sure it has a rulesheet, does NOT have a href (no external stylesheets),
      // and isn't already in the DOM.
      var hasHref = styleSheet.href;
      var ownerNode = styleSheet.ownerNode;
      var hasStyleInDom = ownerNode.innerText && ownerNode.innerText.length > 0;

      if (!hasHref && !hasStyleInDom && styleSheet.cssRules) {
        var serializedStyles = [].slice.call(styleSheet.cssRules).reduce(function (prev, cssRule) {
          return prev + cssRule.cssText;
        }, ''); // Append the serialized styles to the styleSheet's ownerNode to minimize
        // the chances of messing up the cascade order.

        ownerNode.setAttribute(DATA_ATTRIBUTE, 'true');
        ownerNode.appendChild(document.createTextNode(serializedStyles));
      }
    });
    return document;
  }

  var DATA_ATTRIBUTE_VALUE = 'data-percy-input-serialized-value';
  function serializeInputElements(doc) {
    var domClone = doc.documentElement;
    var formElements = domClone.querySelectorAll('input, textarea');
    formElements.forEach(function (el) {
      if (isTextAreaElement(el)) {
        serializeTextAreaElement(el);
        return;
      }

      if (isCheckableElement(el)) {
        serializeCheckableInputElement(el);
        return;
      }

      serializeValueInputElement(el);
    });
    return doc;
  }
  function cleanSerializedInputElements(doc) {
    var formElements = doc.querySelectorAll('input, textarea');
    formElements.forEach(function (el) {
      if (isTextAreaElement(el)) {
        cleanSerializedTextAreaElement(el);
        return;
      }

      if (isCheckableElement(el)) {
        cleanSerializedCheckableInputElement(el);
        return;
      }

      cleanSerializedValueInputElement(el);
    });
  }

  function serializeCheckableInputElement(el) {
    var checkedAttribute = el.getAttribute('checked');
    var checked = el.checked;

    if (checkedAttribute !== null) {
      el.setAttribute(DATA_ATTRIBUTE_VALUE, checkedAttribute);
    }

    setCheckedAttribute(el, checked);
  }

  function serializeTextAreaElement(el) {
    el.setAttribute(DATA_ATTRIBUTE_VALUE, el.defaultValue);
    el.innerText = el.value;
  }

  function serializeValueInputElement(el) {
    var valueAttribute = el.getAttribute('value');
    var value = el.value || '';

    if (valueAttribute !== null) {
      el.setAttribute(DATA_ATTRIBUTE_VALUE, valueAttribute);
    }

    if (value !== valueAttribute) {
      el.setAttribute('value', value);
    }
  }

  function cleanSerializedTextAreaElement(el) {
    var originalValue = el.getAttribute(DATA_ATTRIBUTE_VALUE) || '';
    el.innerText = originalValue;
    el.value = originalValue;
    el.removeAttribute(DATA_ATTRIBUTE_VALUE);
  }

  function cleanSerializedCheckableInputElement(el) {
    cleanPercyValueAttribute(el, 'checked', DATA_ATTRIBUTE_VALUE);
  }

  function cleanSerializedValueInputElement(el) {
    cleanPercyValueAttribute(el, 'value', DATA_ATTRIBUTE_VALUE);
  }

  function cleanPercyValueAttribute(el, attributeName, originalAttributeValue) {
    var originalValue = el.getAttribute(originalAttributeValue);
    el.removeAttribute(originalAttributeValue);

    if (attributeName === 'value' && originalValue !== null) {
      el.value = originalValue;
    }

    if (attributeName === 'checked' && originalValue !== null) {
      el.checked = originalValue !== 'false';
    }

    if (originalValue !== null) {
      el.setAttribute(attributeName, "".concat(originalValue));
      return;
    }

    el.removeAttribute(attributeName);
  }

  function setCheckedAttribute(el, checked) {
    if (checked) {
      el.setAttribute('checked', 'checked');
      return;
    }

    el.removeAttribute('checked');
  }

  function isTextAreaElement(el) {
    return el.tagName.toLowerCase() === 'textarea';
  }

  function isCheckableElement(el) {
    return el.type === 'radio' || el.type === 'checkbox';
  }

  var PercyAgent =
  /*#__PURE__*/
  function () {
    function PercyAgent() {
      var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

      _classCallCheck(this, PercyAgent);

      _defineProperty(this, "clientInfo", void 0);

      _defineProperty(this, "environmentInfo", void 0);

      _defineProperty(this, "xhr", void 0);

      _defineProperty(this, "handleAgentCommunication", void 0);

      _defineProperty(this, "port", void 0);

      _defineProperty(this, "domTransformation", void 0);

      _defineProperty(this, "client", null);

      _defineProperty(this, "defaultDoctype", '<!DOCTYPE html>');

      this.clientInfo = options.clientInfo || null;
      this.environmentInfo = options.environmentInfo || null; // Default to 'true' unless explicitly disabled.

      this.handleAgentCommunication = options.handleAgentCommunication !== false;
      this.domTransformation = options.domTransformation || null;
      this.port = options.port || Constants.PORT;

      if (this.handleAgentCommunication) {
        this.xhr = options.xhr || XMLHttpRequest;
        this.client = new PercyAgentClient("http://localhost:".concat(this.port), this.xhr);
      }
    }

    _createClass(PercyAgent, [{
      key: "snapshot",
      value: function snapshot(name) {
        var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
        var documentObject = options.document || document;
        var domSnapshot = this.domSnapshot(documentObject);

        if (this.handleAgentCommunication && this.client) {
          this.client.post(Constants.SNAPSHOT_PATH, {
            name: name,
            url: documentObject.URL,
            // enableJavascript is deprecated. Use enableJavaScript
            enableJavaScript: options.enableJavaScript || options.enableJavascript,
            widths: options.widths,
            // minimumHeight is deprecated. Use minHeight
            minHeight: options.minHeight || options.minimumHeight,
            clientInfo: this.clientInfo,
            environmentInfo: this.environmentInfo,
            domSnapshot: domSnapshot
          });
        }

        return domSnapshot;
      }
    }, {
      key: "domSnapshot",
      value: function domSnapshot(documentObject) {
        var doctype = this.getDoctype(documentObject);
        var dom = this.stabilizeDOM(documentObject);
        var domClone = dom.cloneNode(true); // Sometimes you'll want to transform the DOM provided into one ready for snapshotting
        // For example, if your test suite runs tests in an element inside a page that
        // lists all yours tests. You'll want to "hoist" the contents of the testing container to be
        // the full page. Using a dom transformation is how you'd acheive that.

        if (this.domTransformation) {
          domClone = this.domTransformation(domClone);
        }

        cleanSerializedInputElements(documentObject);
        var snapshotString = doctype + domClone.outerHTML;
        return snapshotString;
      }
    }, {
      key: "getDoctype",
      value: function getDoctype(documentObject) {
        return documentObject.doctype ? this.doctypeToString(documentObject.doctype) : this.defaultDoctype;
      }
    }, {
      key: "doctypeToString",
      value: function doctypeToString(doctype) {
        var publicDeclaration = doctype.publicId ? " PUBLIC \"".concat(doctype.publicId, "\" ") : '';
        var systemDeclaration = doctype.systemId ? " SYSTEM \"".concat(doctype.systemId, "\" ") : '';
        return "<!DOCTYPE ".concat(doctype.name) + publicDeclaration + systemDeclaration + '>';
      }
    }, {
      key: "stabilizeDOM",
      value: function stabilizeDOM(doc) {
        var stabilizedDOM = doc;
        stabilizedDOM = serializeCssOm(stabilizedDOM);
        stabilizedDOM = serializeInputElements(stabilizedDOM); // more calls to come here

        return stabilizedDOM.documentElement;
      }
    }]);

    return PercyAgent;
  }();

  // This is setup like this so you can import / require percy-agent.js onto your webpage

  return PercyAgent;

}());
