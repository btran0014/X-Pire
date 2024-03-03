package com.example.x_pire;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;

import android.content.Intent;
import android.graphics.Bitmap;
import android.os.Bundle;
import android.os.Environment;
import android.widget.Button;
import android.widget.Toast;
import android.view.View;

import com.google.android.material.textfield.TextInputEditText;
import com.google.firebase.database.DataSnapshot;
import com.google.firebase.database.DatabaseError;
import com.google.firebase.database.DatabaseReference;
import com.google.firebase.database.FirebaseDatabase;
import com.google.firebase.database.ValueEventListener;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;


public class MainActivity extends AppCompatActivity {
    Button btnFridgeContents, btnOpenCamera;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        btnFridgeContents = findViewById(R.id.viewListBtn);
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
            try {
                File photoFile = new File(getExternalFilesDir(Environment.DIRECTORY_PICTURES), "photo.png");
                FileOutputStream fos = new FileOutputStream(photoFile);
                photo.compress(Bitmap.CompressFormat.PNG, 100, fos);
                fos.close();
                //'photoFile' contains the PNG image
            } catch (IOException e) {
                e.printStackTrace();
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