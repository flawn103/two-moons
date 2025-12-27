import { extractStyle } from "@ant-design/static-style-extract";
import { ConfigProvider, theme } from "antd";
import React from "react";
import fs from "fs";
import path from "path";

// Extract all antd component styles
// Excludes popup components which are not needed in SSR: Modal, message, notification, etc.
const css = extractStyle((node) => {
  return (
    <>
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: "rgb(33,41,55)",
          },
          hashed: false,
        }}
      >
        {node}
      </ConfigProvider>
    </>
  );
});

// Ensure the styles directory exists
const stylesDir = path.join(__dirname, "../styles");
if (!fs.existsSync(stylesDir)) {
  fs.mkdirSync(stylesDir, { recursive: true });
}

// Write the extracted CSS to a file
const outputPath = path.join(stylesDir, "antd.css");
fs.writeFileSync(outputPath, css, "utf8");

console.log(`✅ Antd styles extracted successfully to: ${outputPath}`);
console.log(`📦 CSS size: ${(css.length / 1024).toFixed(2)} KB`);
