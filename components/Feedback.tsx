import { Button } from "antd";
import Link from "next/link";

export const Feedback = () => {
  return (
    <Button
      size="large"
      shape="circle"
      icon={
        <Link legacyBehavior href="/#together">
          <img
            src="/pics/feedback.png"
            style={{
              padding: '10px 8px 8px 8px',
              width: "100%",
            }}
          />
        </Link>
      }
      className="fixed shadow-lg"
      style={{
        right: 6,
        bottom: 70,
      }}
    />
  );
};
