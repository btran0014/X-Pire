package com.example.x_pire;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;

import android.content.Intent;
import android.graphics.Bitmap;
import android.os.Bundle;
import android.widget.Button;
import android.view.View;
import android.widget.Toast;

import com.chaquo.python.PyObject;
import com.chaquo.python.Python;
import com.chaquo.python.android.AndroidPlatform;

import java.io.ByteArrayOutputStream;


public class MainActivity extends AppCompatActivity {
    Button btnFridgeContents, btnOpenCamera;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        btnFridgeContents = findViewById(R.id.manualEntryBtn);
        btnOpenCamera = findViewById(R.id.cameraBtn);

        btnFridgeContents.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                Intent viewFridgeContentsIntent = new Intent(getApplicationContext(), FridgeItemDisplay.class);
                startActivity(viewFridgeContentsIntent);
                finish();
            }
        });

        btnOpenCamera.setOnClickListener(v -> CameraHelper.openCamera(MainActivity.this));
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, @Nullable Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        Bitmap photo = CameraHelper.processActivityResult(requestCode, resultCode, data);
        if (photo != null) {
            if (! Python.isStarted()) {
                ByteArrayOutputStream stream = new ByteArrayOutputStream();
                photo.compress(Bitmap.CompressFormat.PNG, 100, stream);
                byte[] byteArray = stream.toByteArray();

                Python.start(new AndroidPlatform(MainActivity.this));

                Python py = Python.getInstance();

                PyObject pyf = py.getModule("imagereader");

                PyObject obj = pyf.callAttr("main", byteArray);
                Toast.makeText(this, "YASSSSS", Toast.LENGTH_SHORT).show();
            }
        } else {
            Toast.makeText(this, "Canceled", Toast.LENGTH_SHORT).show();
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        CameraHelper.onRequestPermissionsResult(this, requestCode, permissions, grantResults);
    }
}