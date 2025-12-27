import { LinkComponent } from "@/components/LinkComp";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { parseLvText } from "@/services/utils";
import fs from "fs";
import { LuvEditor } from "@/components/LuvEditor";
import Head from "next/head";
import path from "path";
import { MODE } from "@/components/LuvEditor/Editor/constants";

export default function PostDetail({ postcontent }) {
  const data = JSON.parse(postcontent);
  const { content } = data;
  const { title } = parseLvText(content);

  return (
    <div className="p-4 md:p-8 m-auto" style={{ maxWidth: 1024 }}>
      {/* <h1 className="mb-4">{title}</h1> */}
      <Head>
        <title>{title}</title>
      </Head>
      <LuvEditor
        linkComp={LinkComponent}
        mode={MODE.VIEW}
        initialValue={content}
      />
    </div>
  );
}

//读取对应md文件
export async function getStaticProps({ params: { slug }, locale }) {
  let filePath = path.join(
    process.cwd(),
    "source",
    "posts",
    slug.join(path.sep) + ".lv"
  );

  if (locale === "en") {
    const enFilePath = path.join(
      process.cwd(),
      "source",
      "posts",
      slug.join(path.sep) + "_en.lv"
    );
    if (fs.existsSync(enFilePath)) {
      filePath = enFilePath;
    }
  }

  if (!fs.existsSync(filePath)) {
    return {
      notFound: true,
    };
  }

  const postcontent = fs.readFileSync(filePath, "utf8");
  return {
    props: {
      slug,
      postcontent,
      ...(await serverSideTranslations(locale ?? "zh", ["common"])),
    },
  };
}

//获取文件路径
export async function getStaticPaths() {
  const files = getAllPostFiles();
  const paths = files.map((filename) => ({
    params: {
      slug: filename.replace(".lv", "").split(path.sep).slice(2), // 搞掉文件路径前面的"sources/posts",
    },
  }));

  return {
    paths,
    fallback: "blocking",
  };
}

function getAllPostFiles(): string[] {
  let dirs = new Array<string>("source/posts");
  let postFiles = new Array<string>();
  while (dirs.length > 0) {
    let currDir = dirs[dirs.length - 1];
    let files = fs.readdirSync(path.join(process.cwd(), currDir), {
      withFileTypes: true,
    });
    dirs.pop();
    files.forEach((file) => {
      if (file.isDirectory()) {
        dirs.push(path.join(currDir, file.name));
      } else if (file.name.endsWith(".lv") && !file.name.endsWith("_en.lv")) {
        postFiles.push(path.join(currDir, file.name));
      }
    });
  }
  return postFiles;
}
