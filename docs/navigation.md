# 页面导航规范

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
