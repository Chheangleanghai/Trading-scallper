import assert from 'node:assert/strict';

// All input labels, including presentation controls, reset the AX parser's active label.
// Trading-equivalence comparison uses the prior report's reviewed 69-variable set.
export function inputLabels(source) {
  return source.split('\n').flatMap(line => {
    const match = line.match(/^\w+\s*=\s*input\.\w+\((.*)\)\s*$/);
    if (!match) return [];
    let depth = 0;
    let quote = '';
    let firstComma = -1;
    for (let index = 0; index < match[1].length; index += 1) {
      const char = match[1][index];
      if (quote) {
        if (char === '\\') index += 1;
        else if (char === quote) quote = '';
      } else if (char === "'" || char === '"') quote = char;
      else if ('(['.includes(char)) depth += 1;
      else if (')]'.includes(char)) depth -= 1;
      else if (char === ',' && depth === 0) {
        firstComma = index;
        break;
      }
    }
    const label = match[1].slice(firstComma + 1).trim().match(/^(['"])(.*?)\1/);
    return label ? [label[2]] : [];
  });
}
export function parseNativeInputs(text, sourceTexts, path = 'native snapshot') {
  const labels = [...new Set(sourceTexts.flatMap(inputLabels))]
    .sort((left, right) => right.length - left.length);
  const start = text.indexOf('tab group indicator-properties-dialog-tabs');
  assert(start >= 0, `Missing native input dialog in ${path}`);
  text = text.slice(start);
  const end = text.indexOf('pop up button (collapsed) Defaults');
  assert(end >= 0, `Missing native input dialog end in ${path}`);
  text = text.slice(0, end);
  let activeLabel = null;
  const values = {};
  for (const line of text.split('\n')) {
    const control = line.replace(/^\s*\d+ /, '');
    if (control.startsWith('text ')) {
      const found = labels.find(label => control.slice(5).endsWith(label));
      if (found) activeLabel = found;
    }
    let label;
    let value;
    if (control.startsWith('checkbox ')) {
      const match = control.match(/Description: (.*), Value: ([01])/);
      if (!match) continue;
      label = match[1];
      value = match[2] === '1';
    } else if (control.startsWith('text field ') || control.startsWith('combo box ')) {
      label = activeLabel;
      value = control.includes('Value: ')
        ? control.split('Value: ')[1].split(', ID:')[0]
        : control.replace(/^[^(]+\([^)]*\) /, '');
    } else continue;
    if (labels.includes(label)) (values[label] ??= []).push(value);
  }
  return values;
}

