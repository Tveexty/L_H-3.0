package com.lumaos.oxygenconnect

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.MediaStore
import android.webkit.*
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.Toast
import android.app.AlertDialog

/**
 * Luma Oxygen Connect — Native Android Companion for Luma OS 1.7 (Oxygen · O-8).
 * Connects seamlessly over Wi-Fi LAN to LumaCore 1.6.0 (:49218) with native Camera capture,
 * multi-file picker, HarmonyOS-style SuperHub file drop, universal clipboard, and remote trackpad.
 */
class MainActivity : Activity() {
    private lateinit var webView: WebView
    private var filePathCallback: ValueCallback<Array<Uri>>? = null
    private val REQ_FILE_PICK = 1001
    private val REQ_PERMS = 1002

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        requestRuntimePermissions()

        webView = WebView(this).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.allowFileAccess = true
            settings.allowContentAccess = true
            settings.mediaPlaybackRequiresUserGesture = false
            setBackgroundColor(0xFF050B18.toInt())
            webViewClient = object : WebViewClient() {
                override fun onReceivedError(v: WebView?, req: WebResourceRequest?, err: WebResourceError?) {
                    if (req?.isForMainFrame == true) {
                        promptConnectDialog()
                    }
                }
            }
            webChromeClient = object : WebChromeClient() {
                override fun onShowFileChooser(
                    view: WebView?,
                    cb: ValueCallback<Array<Uri>>?,
                    params: FileChooserParams?
                ): Boolean {
                    filePathCallback?.onReceiveValue(null)
                    filePathCallback = cb
                    val pick = Intent(Intent.ACTION_GET_CONTENT).apply {
                        addCategory(Intent.CATEGORY_OPENABLE)
                        type = "*/*"
                        putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true)
                    }
                    val cam = Intent(MediaStore.ACTION_IMAGE_CAPTURE)
                    val chooser = Intent.createChooser(pick, "Отправить в Luma OS 1.7 (Oxygen)").apply {
                        putExtra(Intent.EXTRA_INITIAL_INTENTS, arrayOf(cam))
                    }
                    startActivityForResult(chooser, REQ_FILE_PICK)
                    return true
                }
            }
        }
        setContentView(webView)

        val prefs = getSharedPreferences("oxygen_connect", MODE_PRIVATE)
        val savedUrl = prefs.getString("pc_url", "") ?: ""
        if (savedUrl.isBlank()) {
            promptConnectDialog()
        } else {
            webView.loadUrl(savedUrl)
        }
    }

    private fun requestRuntimePermissions() {
        if (Build.VERSION.SDK_INT >= 23) {
            val needed = mutableListOf<String>()
            if (checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
                needed.add(Manifest.permission.CAMERA)
            }
            if (needed.isNotEmpty()) {
                requestPermissions(needed.toTypedArray(), REQ_PERMS)
            }
        }
    }

    private fun promptConnectDialog() {
        val prefs = getSharedPreferences("oxygen_connect", MODE_PRIVATE)
        val ipInput = EditText(this).apply {
            hint = "IP ПК (например: 192.168.1.42)"
            setText(prefs.getString("pc_ip", "192.168.1.") ?: "")
        }
        val pinInput = EditText(this).apply {
            hint = "6-значный PIN из Luma OS 1.7"
            setText(prefs.getString("pc_pin", "") ?: "")
        }
        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(48, 24, 48, 12)
            addView(ipInput)
            addView(pinInput)
        }
        AlertDialog.Builder(this)
            .setTitle("Luma Oxygen Connect (O₂)")
            .setMessage("Введите IP-адрес ПК и PIN из приложения Oxygen Connect в Luma OS 1.7")
            .setView(layout)
            .setPositiveButton("Подключить") { _, _ ->
                val ip = ipInput.text.toString().trim()
                val pin = pinInput.text.toString().trim()
                if (ip.isEmpty()) {
                    Toast.makeText(this, "Укажите IP-адрес ПК", Toast.LENGTH_SHORT).show()
                    return@setPositiveButton
                }
                val url = "http://$ip:49218/?pin=$pin"
                prefs.edit().putString("pc_ip", ip).putString("pc_pin", pin).putString("pc_url", url).apply()
                webView.loadUrl(url)
            }
            .setCancelable(false)
            .show()
    }

    @Deprecated("Deprecated in Java")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode == REQ_FILE_PICK) {
            val cb = filePathCallback
            filePathCallback = null
            if (resultCode != RESULT_OK || data == null) {
                cb?.onReceiveValue(null)
                return
            }
            val uris = mutableListOf<Uri>()
            data.clipData?.let { clip ->
                for (i in 0 until clip.itemCount) {
                    uris.add(clip.getItemAt(i).uri)
                }
            }
            data.data?.let { uris.add(it) }
            cb?.onReceiveValue(if (uris.isEmpty()) null else uris.toTypedArray())
        }
    }
}
