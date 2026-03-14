export const isJsonpString = (str: string): boolean => {
  const trimmed = str.trim();
  return /^[a-zA-Z0-9_$]+\s*\(\s*(\{|\[).+(\}|\])\s*\)$/.test(trimmed);
};

export const parseJsonp = (jsonpStr: string): any => {
  const jsonMatch = jsonpStr.match(/\((.+)\)/s);
  if (jsonMatch && jsonMatch[1]) {
    return JSON.parse(jsonMatch[1]);
  }
  return jsonpStr;
};

export const toResponsePayload = (rawData: any): any => {
  if (typeof rawData === 'string' && isJsonpString(rawData)) {
    return parseJsonp(rawData);
  }
  return rawData;
};

export const syntaxHighlight = (json: string): string => {
  return json
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
      (match) => {
        let cls = 'json-number';
        if (/^"/.test(match)) {
          cls = /:$/.test(match) ? 'json-key' : 'json-string';
        } else if (/true|false/.test(match)) {
          cls = 'json-boolean';
        } else if (/null/.test(match)) {
          cls = 'json-null';
        }
        return `<span class="${cls}">${match}</span>`;
      }
    );
};

export const formatResponseData = (responseData: any): string => {
  const payload = toResponsePayload(responseData?.data);
  try {
    return syntaxHighlight(JSON.stringify(payload, null, 2));
  } catch {
    return String(payload);
  }
};

