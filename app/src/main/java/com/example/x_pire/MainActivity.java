package com.example.x_pire;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;

import android.content.Intent;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.widget.Button;
import android.widget.TextView;
import android.widget.Toast;


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
                Intent viewFridgeContentsIntent = new Intent(getApplicationContext(),FridgeItemDisplay.class);
                startActivity(viewFridgeContentsIntent);
                Toast.makeText(MainActivity.this, "Opening Fridge", Toast.LENGTH_SHORT).show();
                finish();
            }
        });

        btnOpenCamera.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                Intent openCameraIntent = new Intent(getApplicationContext(),CameraCode.class);
                startActivity(openCameraIntent);
                Toast.makeText(MainActivity.this, "Opening Camera!", Toast.LENGTH_SHORT).show();
                finish();
            }
        });
    }

}