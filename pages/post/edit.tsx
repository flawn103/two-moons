import React, { useCallback, useEffect, useRef, useState } from "react";
import { LuvEditor } from "@/components/LuvEditor";
import { Button, Space, Switch, message } from "antd";
import { api } from "@/services/api";
import { useRouter } from "next/router";
import { parseLvText } from "@/services/utils";
import { LinkComponent } from "@/components/LinkComp";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { GetStaticProps } from "next";
import { MODE } from "@/components/LuvEditor/Editor/constants";

const INIT_CONTENT =
  '[{"type":"paragraph","children":[{"text":"🎶 教程中有直观的可播放音符，试着点一点："}]},{"type":"paragraph","children":[{"text":""},{"type":"note","id":"65b83c64-dac9-4f21-aaf9-100fbe1cdab8","noteStr":"C4","editing":false,"children":[{"text":""}]},{"text":""},{"type":"note","id":"65b83c64-dac9-4f21-aaf9-100fbe1cdab8","noteStr":"D4","editing":false,"children":[{"text":""}]},{"text":""},{"type":"note","id":"65b83c64-dac9-4f21-aaf9-100fbe1cdab8","noteStr":"E4","editing":false,"children":[{"text":""}]},{"text":""},{"type":"note","id":"65b83c64-dac9-4f21-aaf9-100fbe1cdab8","noteStr":"G4","editing":false,"children":[{"text":""}]},{"text":""},{"type":"note","id":"65b83c64-dac9-4f21-aaf9-100fbe1cdab8","noteStr":"A4","editing":false,"children":[{"text":""}]},{"text":""}]},{"type":"paragraph","children":[{"text":""}]},{"type":"paragraph","children":[{"text":"🎹 还有可编辑的钢琴窗，试着按下“play”按钮："}]},{"type":"roll","id":"94ac264d-6327-494d-b3de-aacc04ba81f1","data":{"tracks":[{"range":["C3","C5"],"instrument":"piano","notes":[{"value":"C4","time":0,"duration":1},{"value":"D4","time":1,"duration":1},{"value":"E4","time":2,"duration":1},{"value":"G4","time":3,"duration":1},{"value":"A4","time":4,"duration":1},{"value":"A3","time":1,"duration":5},{"value":"G3","time":6,"duration":3},{"value":"B3","time":6,"duration":3},{"value":"F3","time":0,"duration":6},{"value":"B3","time":9,"duration":1},{"value":"G3","time":9,"duration":1},{"value":"E4","time":5,"duration":1},{"value":"G3","time":11,"duration":2},{"value":"B3","time":11,"duration":2},{"value":"C4","time":14,"duration":3},{"value":"G4","time":6,"duration":1},{"value":"C5","time":16,"duration":1},{"value":"B4","time":17,"duration":1},{"value":"A3","time":14,"duration":3},{"value":"C5","time":19,"duration":1},{"value":"G4","time":20,"duration":1},{"value":"D4","time":21,"duration":1},{"value":"E4","time":10,"duration":1},{"value":"C4","time":17,"duration":3},{"value":"A3","time":17,"duration":3},{"value":"E3","time":24,"duration":3},{"value":"C3","time":24,"duration":3},{"value":"C4","time":22,"duration":1},{"value":"D4","time":23,"duration":1},{"value":"G3","time":26,"duration":2},{"value":"E4","time":24,"duration":1},{"value":"A3","time":25,"duration":1},{"value":"D4","time":11,"duration":1},{"value":"C4","time":12,"duration":1},{"value":"G4","time":13,"duration":1},{"value":"E4","time":14,"duration":1}]},{"instrument":"drum","notes":[{"value":"kick","time":0,"duration":1},{"value":"kick","time":8,"duration":1},{"value":"kick","time":12,"duration":1},{"value":"kick","time":5,"duration":1},{"value":"kick","time":24,"duration":1},{"value":"kick","time":20,"duration":1}]}],"timeLength":28,"currentTrack":"piano","bpm":121,"keyboardOctave":4},"children":[{"text":""}]}]';

const App = () => {
  const { t } = useTranslation("common");
  const router = useRouter();
  const { id } = router.query;

  const editorRef = useRef(null);
  const [_, update] = useState({});
  const [isView, setIsView] = useState(false);
  const [saving, setSaving] = useState(false);

  const cache = useCallback(() => {
    const editor = editorRef.current;
    try {
      const contentStr = JSON.stringify(editor.children);
      if (!(contentStr === INIT_CONTENT))
        localStorage.setItem("LUV_LOCAL_EDITOR_STORAGE", contentStr);

      console.log(
        "local storage saved",
        localStorage.getItem("LUV_LOCAL_EDITOR_STORAGE")
      );
    } catch (e) {
      console.log(e, editor.children);
    }
  }, []);

  const recovery = useCallback(
    (options: { notify: boolean } = { notify: true }) => {
      const editor = editorRef.current;
      let cache =
        localStorage.getItem("LUV_LOCAL_EDITOR_STORAGE") || INIT_CONTENT;
      try {
        if (cache === `[]`)
          cache = JSON.stringify([
            {
              type: "paragraph",
              children: [{ text: "" }],
            },
          ]);
        editor.children = JSON.parse(cache);
        update({});
        options.notify && message.success(t("恢复记录成功"));
      } catch (e) {
        message.error(t("解析失败，请检查数据"));
      }
    },
    []
  );

  const updateOrAdd = async (type: "add" | "update") => {
    const editor = editorRef.current;
    const contentStr = JSON.stringify(editor.children);
    const { title } = parseLvText(editor.children);

    const reqFunc = type === "add" ? "post" : "put";
    return await api[reqFunc]("/post", {
      content: contentStr,
      title,
      id: type === "add" ? undefined : id,
    });
  };

  useEffect(() => {
    const interval = setInterval(cache, 8000);
    if (id) {
      api
        .get("/post", {
          params: {
            id,
          },
        })
        .then((data) => {
          const editor = editorRef.current;
          if (!data) {
            message.error(t("当前文章不存在"));
            setTimeout(() => {
              location.href = "/post/edit";
            }, 2000);
            return;
          }
          editor.children =
            JSON.parse((data as any).content) || JSON.parse(INIT_CONTENT);

          update({});
        });
    } else {
      recovery({ notify: false });
    }

    return () => {
      clearInterval(interval);
    };
  }, [id]);

  return (
    <div className="p-4 md:p-8 m-auto" style={{ maxWidth: 1024 }}>
      <header className="mb-8">
        <Space>
          {id ? (
            <Button
              loading={saving}
              onClick={async () => {
                setSaving(true);
                try {
                  await updateOrAdd("update");
                  message.success(t("已保存"));
                } catch {
                } finally {
                  setSaving(false);
                }
              }}
            >
              {t("保存")}
            </Button>
          ) : (
            <Button
              loading={saving}
              onClick={async () => {
                setSaving(true);
                try {
                  const res = await updateOrAdd("add");
                  message.success(t("已发布"));
                  setTimeout(() => {
                    router.push("/post/edit?id=" + res.id);
                  }, 1000);
                } catch {
                } finally {
                  setSaving(false);
                }
              }}
            >
              {t("发布")}
            </Button>
          )}
          <Button
            onClick={() => {
              window.open("/post/list");
            }}
          >
            {t("文章列表")}
          </Button>

          <Switch
            unCheckedChildren={t("预览")}
            checkedChildren={t("预览")}
            onChange={(value) => setIsView(value)}
            value={isView}
          />
        </Space>
      </header>
      <LuvEditor
        linkComp={LinkComponent}
        sticky={36}
        editorRef={editorRef}
        mode={isView ? MODE.VIEW : MODE.EDIT}
        upload={async (file) => {
          const formData = new FormData();
          formData.append("file", file);
          const res = await api.post("upload", formData, {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          });

          return res;
        }}
        initialValue={[
          {
            type: "paragraph",
            children: [{ text: "" }],
          },
        ]}
      />
    </div>
  );
};

export default App;

export const getStaticProps: GetStaticProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? "zh", ["common"])),
    },
  };
};
