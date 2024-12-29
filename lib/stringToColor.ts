function stringToColor(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  const c = (hash & 0x00ffffff).toString(16).toUpperCase(); // Convert to hex and remove alpha
  return "#" + "00000".substring(0, 6 - c.length) + c; // Add leading zeros if necessary
}

export default stringToColor;
