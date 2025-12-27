// heavy

import { api } from "@/services/api";
import { Alert, Button, Card, Divider, Input, Space } from "antd";
import { useContext, useEffect, useRef, useState } from "react";
import {
  RightOutlined,
  LeftOutlined,
  BookOutlined,
  BookFilled,
} from "@ant-design/icons";
import styles from "./index.module.scss";
import { proxy, useSnapshot } from "valtio";
import classNames from "classnames";
import ReactMarkdown from "react-markdown";
import React from "react";
import {
  use as composer,
  Component as Composer,
} from "@/source/agents/composer";
import { StateContext } from "@/pages/_app";
import { useTranslation } from "next-i18next";

const MAX_TOKEN = 2000;
const MAX_TOKEN_LOGGED_IN = 4000;
const TOOLS_MAP = {
  composer,
};

const ComponentMap = {
  composer: Composer,
};

export const MsgItem: React.FC<{
  role: string;
  content?: string;
  props?: any;
  component?: string;
}> = ({ role, content, component, props }) => {
  if (role === "tool_card" && component) {
    return React.createElement(ComponentMap[component], props);
  }

  return (
    <>
      {role === "temp" ? (
        <Alert showIcon message={content} type="warning" closable />
      ) : (
        <div
          className={classNames({
            [styles["msg-item"]]: true,
            [styles["msg-item--assistant"]]: role === "assistant",
            [styles["msg-item--user"]]: role === "user",
            [styles["msg-item--temp"]]: role === "temp",
          })}
        >
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      )}
    </>
  );
};

export const Mooner: React.FC = () => {
  const globalState = useContext(StateContext);
  const { user } = useSnapshot(globalState);
  const isLoggedIn = user && user.id;
  const currentMaxToken = isLoggedIn ? MAX_TOKEN_LOGGED_IN : MAX_TOKEN;
  const { t } = useTranslation("common");

  const [state] = useState(
    proxy({
      question: "",
      warning: "",
      msg: "",
      loading: false,
      history: [],
    })
  );

  const { loading, history } = useSnapshot(state);
  const { question } = useSnapshot(state, {
    sync: true,
  });

  const chatContainerRef = useRef(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [loading]);

  const validHistoryFilter = (item, index) => {
    return (
      item.role !== "temp" &&
      state.history[index + 1]?.role !== "temp" &&
      item.role !== "tool_card"
    );
  };

  const isOverflow = (newHistory?: any) => {
    return (
      JSON.stringify((newHistory || history).filter(validHistoryFilter))
        .length > currentMaxToken
    );
  };
  const sendMessages = async () => {
    const res = await api.post("ai-mooner", {
      history: state.history.filter(validHistoryFilter),
    });

    // Remove <think>...</think> tags from the response content
    if (res.content) {
      res.content = res.content.replace(/<think>.*<\/think>\n?/gs, "");
    }

    state.history.push(res);
    return res;
  };
  const handleMoonerRes = async (res) => {
    if (res.tool_calls) {
      const funcInfo = res.tool_calls[0].function;
      const { name } = funcInfo;
      const args = JSON.parse(funcInfo.arguments);
      const tool = TOOLS_MAP[name];
      if (!tool) return;
      if (tool) {
        const res = await tool(args, state);
        if (res.role === "tool_card") {
          state.history.push(res);
        } else if (res.role === "tool") {
          state.history.push(res);
          sendMessages();
        }
      }
    }
  };

  return (
    <div className="w-full">
      {history.length !== 0 && (
        <>
          <div
            ref={chatContainerRef}
            className="flex flex-col gap-2 max-h-80 overflow-auto p-4"
          >
            {history
              .filter((item) => !item.tool_calls)
              .map((item) => (
                <MsgItem key={item.content} {...item} />
              ))}

            <Button
              className="text-gray-400"
              size="small"
              type="text"
              onClick={() => (state.history = [])}
            >
              {t("清空")}
            </Button>
          </div>
          <Divider className="m-0" />
        </>
      )}

      <Space direction="vertical" className="w-full p-4">
        <Input
          onInput={(e) => (state.question = (e.target as any).value)}
          value={question}
          placeholder={t("输入你想询问的问题")}
        />
        <Button
          disabled={isOverflow() || !question}
          className="w-full"
          loading={loading}
          onClick={async () => {
            state.loading = true;
            try {
              const newHistory = [
                ...history,
                {
                  role: "user",
                  content: question,
                },
              ];
              state.history = newHistory;
              state.question = "";
              const res = await sendMessages();
              await handleMoonerRes(res);
            } catch (e) {
              state.history.push({
                role: "temp",
                content: t("出错了，请再试一次"),
              });
              console.error(e);
            } finally {
              state.loading = false;
            }
          }}
        >
          {isOverflow() ? t("对话过长，请清空后再发送") : t("发送")}
        </Button>
      </Space>
    </div>
  );
};
