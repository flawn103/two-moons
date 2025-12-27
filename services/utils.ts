import _, { isArray, isObject } from "lodash";

export const objToCamelCase = (obj) => {
  return _.mapKeys(obj, (_value, key) => _.camelCase(key));
};

export const arrayToCamelCase = (array) => {
  return _.map(array, (obj) => objToCamelCase(obj));
};

const HEADING_TYPES = ["heading-one", "paragraph"];
export const parseLvText = (data) => {
  let title = "";
  let content = "";

  _.forEach(data, (block) => {
    if (!title && HEADING_TYPES.includes(block.type)) {
      title = _.map(block.children, (child) => child.text).join("");
    } else {
      content += _.map(block.children, (child) => child.text).join("") + " ";
    }
  });

  return {
    title,
    content: content.slice(0, -1),
  };
};

export const response = (res, data, code?) => {
  let result;
  if (isArray(data)) result = arrayToCamelCase(data);
  else if (isObject(data)) result = objToCamelCase(data);
  else result = data;

  res.status(code ?? 200).json(result);
};
