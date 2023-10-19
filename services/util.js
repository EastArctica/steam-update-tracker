module.exports = {
  // base64 to utf-??
  atob: (str) => Buffer.from(str, "base64").toString(),
  // utf-?? to base64
  btoa: (str) => Buffer.from(str).toString("base64"),
};
