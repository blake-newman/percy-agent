"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const DATA_ATTRIBUTE_VALUE = 'data-percy-input-serialized-value';
function serializeInputElements(doc) {
    const domClone = doc.documentElement;
    const formElements = domClone.querySelectorAll('input, textarea');
    formElements.forEach((el) => {
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
exports.serializeInputElements = serializeInputElements;
function cleanSerializedInputElements(doc) {
    const formElements = doc.querySelectorAll('input, textarea');
    formElements.forEach((el) => {
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
exports.cleanSerializedInputElements = cleanSerializedInputElements;
function serializeCheckableInputElement(el) {
    const checkedAttribute = el.getAttribute('checked');
    const checked = el.checked;
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
    const valueAttribute = el.getAttribute('value');
    const value = el.value || '';
    if (valueAttribute !== null) {
        el.setAttribute(DATA_ATTRIBUTE_VALUE, valueAttribute);
    }
    if (value !== valueAttribute) {
        el.setAttribute('value', value);
    }
}
function cleanSerializedTextAreaElement(el) {
    const originalValue = el.getAttribute(DATA_ATTRIBUTE_VALUE) || '';
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
    const originalValue = el.getAttribute(originalAttributeValue);
    el.removeAttribute(originalAttributeValue);
    if (attributeName === 'value' && originalValue !== null) {
        el.value = originalValue;
    }
    if (attributeName === 'checked' && originalValue !== null) {
        el.checked = originalValue !== 'false';
    }
    if (originalValue !== null) {
        el.setAttribute(attributeName, `${originalValue}`);
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
