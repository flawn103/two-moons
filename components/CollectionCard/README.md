# CollectionCard 组件

一个可复用的合集包卡片组件，用于显示和管理分享的和弦/乐句合集。

## 功能特性

- 📦 显示合集包的基本信息（名称、类型、数量）
- 🎵 支持和弦和乐句两种类型的合集
- 🔄 可展开/折叠查看合集内容
- 🎹 支持和弦播放预览
- 📥 可选的导入功能
- 🎨 响应式设计，适配不同屏幕尺寸

## Props

| 属性 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `shareUuid` | `string` | ✅ | - | 分享的唯一标识符 |
| `showImportButton` | `boolean` | ❌ | `true` | 是否显示导入按钮 |
| `onImport` | `(uuid: string) => void` | ❌ | - | 导入回调函数，如果不提供则使用内置导入逻辑 |

## 使用示例

### 基础使用

```tsx
import { CollectionCard } from '@/components/CollectionCard';

function MyComponent() {
  return (
    <CollectionCard 
      shareUuid="your-share-uuid-here" 
    />
  );
}
```

### 自定义导入处理

```tsx
import { CollectionCard } from '@/components/CollectionCard';

function MyComponent() {
  const handleImport = (uuid: string) => {
    console.log('导入合集:', uuid);
    // 自定义导入逻辑
  };

  return (
    <CollectionCard 
      shareUuid="your-share-uuid-here"
      onImport={handleImport}
    />
  );
}
```

### 仅预览模式（不显示导入按钮）

```tsx
import { CollectionCard } from '@/components/CollectionCard';

function MyComponent() {
  return (
    <CollectionCard 
      shareUuid="your-share-uuid-here"
      showImportButton={false}
    />
  );
}
```

### 在网格布局中使用

```tsx
import { CollectionCard } from '@/components/CollectionCard';

function MarketPlace() {
  const shareUuids = ['uuid1', 'uuid2', 'uuid3'];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {shareUuids.map((uuid) => (
        <CollectionCard 
          key={uuid}
          shareUuid={uuid}
          onImport={(uuid) => console.log('导入:', uuid)}
        />
      ))}
    </div>
  );
}
```

## 数据结构

组件会自动从API获取分享数据，期望的数据结构如下：

```typescript
interface ShareData {
  uuid: string;
  name: string;
  createdAt: string;
  content: string; // JSON字符串，包含合集数据
}

interface Collection {
  id: string;
  name: string;
  type: 'chord' | 'phrase';
  count: number;
}
```

## 依赖

- Ant Design (Button, Card, Tag, Spin, message)
- Valtio (状态管理)
- next-i18next (国际化)
- 内部组件: ChordCollection, PhraseBlock
- 内部工具: api, importShareData, playChord

## 注意事项

1. 组件会自动处理加载状态和错误状态
2. 和弦播放功能需要音频上下文支持
3. 导入功能需要用户登录状态
4. 组件使用了 Tailwind CSS 类名进行样式设置