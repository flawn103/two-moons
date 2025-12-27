import React, { useState } from "react";
import { Button, Card, Tag } from "antd";
import { ImportOutlined } from "@ant-design/icons";
import { useTranslation } from "next-i18next";
import { ChordCollection } from "@/components/ChordCollection";
import { importMarketItem } from "@/utils/marketImport";
import { playInstrumentData } from "@/utils/calc";
import { getCollectionInstrument } from "@/utils/chord";

interface MarketItemCardProps {
  item: any;
}

export const MarketItemCard: React.FC<MarketItemCardProps> = ({ item }) => {
  const { t } = useTranslation("market");
  const [importing, setImporting] = useState(false);

  const handleImport = async () => {
    setImporting(true);
    try {
      await importMarketItem(item, t);
    } finally {
      setImporting(false);
    }
  };

  const renderPreview = () => {
    const { content } = item;

    const { collection, chords } = content;
    if (!collection) return null;

    // Reconstruct blocks in order
    const blocks = (collection.ids || [])
      .map((id: string) => chords.find((c: any) => c.id === id))
      .filter(Boolean);

    return (
      <ChordCollection
        root={collection.rootNote || null}
        instrument={collection.instrument || "piano"}
        isEdit={false}
        blocks={blocks}
        lengths={collection.lengths || []}
        playConfig={collection.playConfig}
        showAutoAccompaniment={true}
        onSelect={(id, isTriggeredByClick = true) => {
          if (!isTriggeredByClick) return;

          const chord = blocks.find((c) => c.id === id);
          if (chord) {
            playInstrumentData(
              chord,
              0.1,
              getCollectionInstrument(collection, blocks)
            );
          }
        }}
        onSort={() => {}}
        onDelete={() => {}}
        onRename={() => {}}
        onCollect={() => {}}
      />
    );
  };

  const getTitle = () => {
    return item.content?.collection?.name || t("未命名和弦进行");
  };

  return (
    <Card
      hoverable
      className="w-full shadow-sm hover:shadow-md transition-shadow duration-200"
      bodyStyle={{ padding: "16px" }}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="font-thin">{getTitle()}</h3>
          <div className="text-xs text-gray-400 mb-3">
            {item.created_by ? ` • by ${item.created_by}` : ""}
          </div>
        </div>

        <Button
          type="primary"
          icon={<ImportOutlined />}
          onClick={handleImport}
          loading={importing}
          className="ml-4"
        >
          {t("导入")}
        </Button>
      </div>

      {renderPreview()}
    </Card>
  );
};
