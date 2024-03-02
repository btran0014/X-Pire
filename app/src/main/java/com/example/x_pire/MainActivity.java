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

import com.google.android.material.textfield.TextInputEditText;
import com.google.firebase.database.DataSnapshot;
import com.google.firebase.database.DatabaseError;
import com.google.firebase.database.DatabaseReference;
import com.google.firebase.database.FirebaseDatabase;
import com.google.firebase.database.ValueEventListener;


public class MainActivity extends AppCompatActivity {

    Button btnFridgeContents, btnOpenCamera;
    private DatabaseReference fridgeItemDatabase;


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
                finish();
            }
        });

        btnOpenCamera.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                //Intent openCameraIntent = new Intent(getApplicationContext(),CameraCode.class);
                //startActivity(openCameraIntent);
                //Toast.makeText(MainActivity.this, "Opening Camera!", Toast.LENGTH_SHORT).show();
                //finish();
                fridgeItemDatabase = FirebaseDatabase.getInstance().getReference("fridgeItems");
                String fridgeItemID = fridgeItemDatabase.push().getKey();
                FridgeItem addFridgeItem = new FridgeItem(fridgeItemID, "Milk","02/28/2024", "03/22/2024 ",03222024);
                fridgeItemDatabase.child(fridgeItemID).setValue(addFridgeItem);
                Toast.makeText(MainActivity.this, "NEW ITEM ADDED", Toast.LENGTH_SHORT).show();

            }
        });
    }

}