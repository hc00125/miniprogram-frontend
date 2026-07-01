<<<<<<< HEAD
# 前端页面导航规范

## 页面分级

### 一级主页面

底部导航对应的页面属于一级主页面：

- 首页：`/pages/boss/home/index?tab=home`
- 点单：`/pages/boss/home/index?tab=order`
- 订单：`/pages/boss/query/index`
- 陪玩：`/pages/player/list/index`
- 我的：`/pages/client/profile/index`

一级主页面之间必须通过 `switchMainTab()` 切换。该函数使用 `uni.reLaunch()`，不会继续向微信小程序页面栈压入页面。

```ts
import { switchMainTab } from '@/utils/nav'

switchMainTab('query')
switchMainTab('players')
switchMainTab('profile')
```

首页和点单共用同一个页面。用户已经位于首页页面时，应优先在页面内部切换 swiper，而不是重新启动页面。

### 二级页面

订单详情、账号信息、陪玩申请等需要正常返回的页面使用 `openPage()`：

```ts
import { openPage } from '@/utils/nav'

openPage('/pages/boss/waiting/index', { orderNo })
openPage('/pages/client/account/index')
openPage('/pages/player/apply/index')
```

`openPage()` 内部使用 `uni.navigateTo()`，会保留上一级页面。

### 流程替换页面

登录完成、下单成功、提交成功等不应返回旧表单的流程使用 `replacePage()`：

```ts
import { replacePage } from '@/utils/nav'

replacePage('/pages/boss/waiting/index', { orderNo })
```

`replacePage()` 内部使用 `uni.redirectTo()`，会替换当前页面。

## 禁止事项

- 禁止使用 `navigateTo` 切换底部主导航页面。
- 禁止在业务页面中重复维护主页面路径表。
- 禁止登录成功、下单成功后继续保留可重复提交的旧表单页面。
- 禁止通过连续 `navigateBack()` 猜测一级主页面的位置。

## 兼容接口

旧的 `go()`、`replace()`、`goMain()` 和 `navigateToTab()` 暂时保留，避免一次性修改全部页面造成风险：

- `go()` 等价于 `openPage()`。
- `replace()` 等价于 `replacePage()`。
- `goMain()` 等价于 `switchMainTab()`。
- `navigateToTab()` 已改为调用 `switchMainTab()`，不再产生页面堆栈。

新增页面应直接使用语义清晰的新接口。
=======
﻿# 页面导航规范

## 主页签（原生 tabBar）

应用底部使用 WeChat 原生 tabBar，5 个主页面签：

- 首页 `/pages/boss/home/index`
- 点单 `/pages/boss/order/index`
- 订单 `/pages/boss/query/index`
- 陪玩 `/pages/player/list/index`
- 我的 `/pages/client/profile/index`

主页面签之间通过 `uni.switchTab()` 切换，每个主页面签在页面栈中只有一份实例。

```ts
import { goMain } from '@/utils/nav'

goMain('home')
goMain('order')
goMain('query')
goMain('players')
goMain('profile')
```

`go()` 和 `replace()` 会自动检测目标路径是否为主页面签：是则走 `uni.switchTab()`，否则走正常的 navigateTo/redirectTo。

## 子页面

子页面通过 `go()` 打开，会叠加在导航栈上：

```ts
import { go } from '@/utils/nav'

go('/pages/boss/waiting/index', { orderNo })
go('/pages/player/order-detail/index', { orderNo: '123' })
```

## 防栈累积

子页面（如陪玩的"我的接单" → "订单详情"）之间跳转时，用 `backToRoute()` 返回已知路由，避免重复叠加：

```ts
import { backToRoute } from '@/utils/nav'

// 优先回退到已有的 /pages/player/grab/index 页面
// 如果栈中不存在，则 redirectTo
backToRoute('/pages/player/grab/index')
```

陪玩登录成功后使用 `replace()` 跳转到大厅，避免把登录页留在栈中：

```ts
import { replace } from '@/utils/nav'

replace('/pages/player/grab/index')
```

## 导航函数速查

| 函数 | 适用场景 | 主页面签行为 |
|------|---------|------------|
| `go(path, params)` | 打开子页面 | → `switchTab` |
| `replace(path, params)` | 替换当前页面 | → `switchTab` |
| `relaunch(path, params)` | 重启应用 | → `switchTab` |
| `goMain(tab)` | 切换到主页面签 | → `switchTab` |
| `backToRoute(path)` | 回退到已知路由，防栈累积 | 退栈或 redirectTo |
| `back(delta)` | 返回上一页 | — |
>>>>>>> feat/product-order-management
