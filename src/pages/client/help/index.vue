<template>
  <view :style="appThemeStyle" class="help-page">
    <view class="help-shell">
      <view class="help-hero">
        <text class="help-title">帮助与规则</text>
      </view>
      <view class="help-card">
        <button class="help-row" data-action="player-guide" hover-class="help-pressed" @tap="go('/pages/client/help/player-guide')">
          <view class="help-row-main"><text class="help-row-title">陪玩操作手册</text><text class="help-row-copy">接单、入房、计时与提现</text></view>
          <image class="help-chevron" :src="uiIcons.chevron" mode="aspectFit" aria-hidden="true" />
        </button>
        <button class="help-row" data-action="user-guide" hover-class="help-pressed" @tap="go('/pages/client/help/user-guide')">
          <view class="help-row-main"><text class="help-row-title">用户操作手册</text><text class="help-row-copy">下单、付款、续单与评价</text></view>
          <image class="help-chevron" :src="uiIcons.chevron" mode="aspectFit" aria-hidden="true" />
        </button>
        <button class="help-row" data-action="conduct" hover-class="help-pressed" @tap="go('/pages/client/help/conduct')">
          <view class="help-row-main"><text class="help-row-title">平台守则</text><text class="help-row-copy">账号、交易与双方行为要求</text></view>
          <image class="help-chevron" :src="uiIcons.chevron" mode="aspectFit" aria-hidden="true" />
        </button>
        <button class="help-row" data-action="usage" hover-class="help-pressed" @tap="go('/pages/client/help/usage')">
          <view class="help-row-main"><text class="help-row-title">使用规范</text><text class="help-row-copy">沟通、隐私与真实服务记录</text></view>
          <image class="help-chevron" :src="uiIcons.chevron" mode="aspectFit" aria-hidden="true" />
        </button>
        <button class="help-row" data-action="order-violations" hover-class="help-pressed" @tap="go('/pages/client/help/order-violations')">
          <view class="help-row-main"><text class="help-row-title">违规订单认定与处置</text><text class="help-row-copy">虚假交易、恶意占单与异议核实</text></view>
          <image class="help-chevron" :src="uiIcons.chevron" mode="aspectFit" aria-hidden="true" />
        </button>
        <button class="help-row" data-action="aftercare" hover-class="help-pressed" @tap="go('/pages/client/help/aftercare')">
          <view class="help-row-main"><text class="help-row-title">售后介入规范</text><text class="help-row-copy">服务异常、反馈证据与客服处理</text></view>
          <image class="help-chevron" :src="uiIcons.chevron" mode="aspectFit" aria-hidden="true" />
        </button>
        <button class="help-row" data-action="recharge-refund" hover-class="help-pressed" @tap="go('/pages/client/help/recharge-refund')">
          <view class="help-row-main"><text class="help-row-title">退款规则</text><text class="help-row-copy">充值、订单取消与退款核对</text></view>
          <image class="help-chevron" :src="uiIcons.chevron" mode="aspectFit" aria-hidden="true" />
        </button>
        <button class="help-row" data-action="player-agreement" hover-class="help-pressed" @tap="go('/pages/client/help/player-agreement')">
          <view class="help-row-main"><text class="help-row-title">陪玩服务约定</text><text class="help-row-copy">认证、履约责任与收益结算</text></view>
          <image class="help-chevron" :src="uiIcons.chevron" mode="aspectFit" aria-hidden="true" />
        </button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { currentTheme, themeStyleFor } from '@/utils/theme'
import { go } from '@/utils/nav'
import { uiIcons } from '@/utils/uiIcons'

const appThemeStyle = computed(() => themeStyleFor(currentTheme.value))
</script>

<style scoped src="./help.css"></style>
