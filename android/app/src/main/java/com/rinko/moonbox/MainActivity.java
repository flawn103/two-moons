package com.rinko.moonbox;
 import android.graphics.Color;
 import android.os.Build;
 import android.view.View;
 import android.view.WindowManager;
 import android.webkit.WebView;
 import android.os.Bundle;

 import androidx.core.view.WindowCompat;

 import com.getcapacitor.BridgeActivity;

 import java.lang.reflect.Method;

public class MainActivity extends BridgeActivity {
     public void onCreate(Bundle savedInstanceState) {
         super.onCreate(savedInstanceState);
         try {
             Class<?> layoutParamsExClass = Class.forName("com.huawei.android.view.LayoutParamsEx");
             Method addFlagsMethod = layoutParamsExClass.getMethod("addHwFlags", int.class);
             addFlagsMethod.invoke(getWindow().getAttributes(), 0x80000000); // FLAG_HIDE_NOTCH
         } catch (Exception ignored) {}

         WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
         View decor = getWindow().getDecorView();
         // 1. 触发“浅色状态栏” → 系统把文字/图标描成黑色
         decor.setSystemUiVisibility(decor.getSystemUiVisibility() | View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR);
         // 2. 背景保持透明，WebView 继续全屏
         getWindow().setStatusBarColor(Color.TRANSPARENT);

         WebView.setWebContentsDebuggingEnabled(true);
     }
}
