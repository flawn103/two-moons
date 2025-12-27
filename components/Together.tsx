"use client";

import { Button } from "antd";
import { Avator } from "./Avator";
import { useSnapshot } from "valtio";
import { appStore } from "@/stores/store";
import Link from "next/link";
import { LoginOrRegist } from "./LoginOrRegist";
import { useTranslation } from "next-i18next";
import Image from "next/image";

export const CONTRIBUTORS = [
  {
    name: "moayuisuda",
    href: "https://github.com/moayuisuda",
    slogan: <span>もう一回</span>,
    img: "/avators/suda.jpg",
  },
  {
    name: "roshengy",
    img: "/avators/roshengy.jpg",
  },
  {
    name: "Lusia",
    img: "/avators/Lusia.jpeg",
  },
  {
    name: "Macchiatooo",
    img: "/avators/Macchiatooo.png",
  },
  {
    name: "BX-Esther",
    img: "/avators/BX-Esther.jpg",
  },
];

export const Together = () => {
  const { user } = useSnapshot(appStore);
  const { t } = useTranslation(["user"]);

  return (
    <div id="together" className="flex items-center flex-col w-full">
      {/* 如何添加为app说明按钮 - 仅在非PWA模式下显示 */}
      <div className="flex gap-2 mb-8">
        {!user.token && (
          <Link href="/regist">
            <Button
              type="primary"
              className="bg-primary border-primary hover:bg-primary-dark hover:border-primary-dark"
            >
              {t("注册")}
            </Button>
          </Link>
        )}
        <LoginOrRegist />
      </div>

      <h1 className="font-thin mb-2">{t("贡献者")}</h1>
      <div className="flex gap-4 flex-wrap justify-center">
        {CONTRIBUTORS.map((contributor) => (
          <Avator
            key={contributor.name}
            label={
              <a
                href={contributor.href}
                className="text-inherit font-sans"
                target="_blank"
              >
                {contributor.name}
              </a>
            }
            slogan={contributor.slogan}
            img={contributor.img}
          />
        ))}
      </div>

      {/* <div className="mt-8">
        <img
          className="w-64"
          src="https://luv-club.oss-cn-chengdu.aliyuncs.com/9675a80d2dc3cfcba0c34a83d513ad47.png"
          alt=""
        />
      </div> */}
      <a href="https://afdian.com/a/rinnko" className="mt-8">
        <img
          width="200"
          src="https://pic1.afdiancdn.com/static/img/welcome/button-sponsorme.png"
          alt=""
        />
      </a>
    </div>
  );
};
