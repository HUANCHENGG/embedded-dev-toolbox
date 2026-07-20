# 青空工具箱 (embedded-dev-toolbox)

嵌入式开发者在线工具箱。纯静态单页应用:无构建、无框架、无服务器、无 npm 依赖,浏览器打开 `index.html` 即用。唯一外部依赖是 CDN 引入的 crypto-js(仅 MD5/SHA/AES 用)。

## 项目结构

```
index.html        单页入口,所有工具的 HTML 面板都在这一个文件里
css/style.css     全部样式,单文件
js/utils.js       通用工具函数(复制、hex 解析等)
js/app.js         标签切换、hash 路由、localStorage 记忆
js/tool-search.js 顶部搜索框的工具注册表
js/tool-*.js      各分类的功能模块,一个分类一个文件
test-all.js       Node 下模拟 DOM 的全模块测试
crc-test.js       CRC 参数模型的独立测试
```

## 代码约定

- **ES5 风格**:`var` + IIFE 模块,不用 let/const/箭头函数/class/模板字符串。每个 `tool-*.js` 导出一个全局对象(如 `TimestampTools`),HTML 通过 `onclick="XxxTools.method()"` 调用
- **注释全中文**,面向新工程师,函数用 JSDoc 风格(`@param`/`@returns`)
- **文件编码 UTF-8 + CRLF**,新文件保持一致
- 不引入新的外部依赖、构建步骤或框架;计算逻辑必须纯浏览器本地完成,数据不出浏览器
- UI 文案中文;结果展示行配"复制"按钮(样式照抄现有 `ts-live-row` 模式)

## 新增一个工具的完整清单

以在分类 `<cat>` 下新增工具 `<tool>` 为例,共 5 处,缺一不可:

1. `index.html`:对应 `data-category="<cat>"` 的分类区内加 `<button class="sub-tab" data-tool="<tool>">` 子标签 + `<div class="tool-panel" data-tool="<tool>">` 面板
2. `js/tool-<cat>.js`:实现功能函数并挂到该分类的全局对象上
3. `js/app.js`:`findCategoryByTool()` 的 map 中注册 `'<tool>': '<cat>'`;若是新分类还要改 `getDefaultTool()` 和 cats 数组
4. `js/tool-search.js`:`TOOLS` 注册表加条目(name / keywords 中英文都写 / category / tool)
5. `test-all.js`:为核心逻辑加断言(纯逻辑部分必测;依赖 DOM 的渲染可利用文件内现成的 mock)

## 验证

改完必须跑:

```
node test-all.js
```

全部断言通过才算完成。涉及 UI 的改动另外在浏览器打开 `index.html` 人工确认(标签切换、hash 路由 `#<tool>` 直达、搜索能搜到)。

## 定时器约定

需要每秒刷新的工具(如当前时间戳)统一走 `app.js` 的分类切换钩子:切入分类时 `startLive()`,切出时 `stopLive()`,不允许常驻定时器。

## Git

- 提交信息格式:`feat:`/`fix:`/`chore:` + 中文描述(见 git log 既有风格)
- 远端:https://github.com/HUANCHENGG/embedded-dev-toolbox (push 前须经作者确认)
