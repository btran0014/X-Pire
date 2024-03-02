package com.example.x_pire;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;

import android.content.Intent;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.widget.AdapterView;
import android.widget.Button;
import android.widget.ListView;
import android.widget.Toast;

import java.util.ArrayDeque;
import java.util.Deque;

import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;

import java.util.ArrayList;
import java.util.List;


import com.google.android.material.textfield.TextInputEditText;
import com.google.firebase.database.DataSnapshot;
import com.google.firebase.database.DatabaseError;
import com.google.firebase.database.DatabaseReference;
import com.google.firebase.database.FirebaseDatabase;
import com.google.firebase.database.ValueEventListener;

public class FridgeItemDisplay extends AppCompatActivity {
    private Button btnReturn;
    private ListView fridgeItemList;
    private List<FridgeItem> fridgeItems;

    private DatabaseReference fridgeItemDatabase;
protected void onCreate(Bundle savedInstanceState){
    super.onCreate(savedInstanceState);
    setContentView(R.layout.fridge_items_list);
    btnReturn = (Button) findViewById(R.id.btnReturn);
    fridgeItemList = findViewById(R.id.fridgeItemList);
    fridgeItems = new ArrayList<>();

    fridgeItemDatabase = FirebaseDatabase.getInstance().getReference("fridgeItems");

    btnReturn.setOnClickListener(new View.OnClickListener() {
        @Override
        public void onClick(View view) {
            Intent returnIntent = new Intent(getApplicationContext(), MainActivity.class);
            startActivity(returnIntent);
            finish();
        }
    });

    fridgeItemList.setOnItemLongClickListener(new AdapterView.OnItemLongClickListener() {
        @Override
        public boolean onItemLongClick(AdapterView<?> adapterView, View view, int i, long l) {
            removeFridgeItem(i);
            return true;
        }
    });


}
private void removeFridgeItem(int i){
    //POSSIBLE ERROR
    FridgeItem currentItem = fridgeItems.get(i);
    DatabaseReference dR = FirebaseDatabase.getInstance().getReference("fridgeItems").child(currentItem.getItemID());
    dR.removeValue();
    Toast.makeText(FridgeItemDisplay.this, "Removed Item", Toast.LENGTH_SHORT).show();

}
private void createFridgeItem(String itemName, String itemLogDate, String itemExpiryDate){
    String fridgeItemID = fridgeItemDatabase.push().getKey();
    FridgeItem addFridgeItem = new FridgeItem(fridgeItemID, itemName, itemLogDate, itemExpiryDate);
    fridgeItemDatabase.child(fridgeItemID).setValue(addFridgeItem);
    Toast.makeText(FridgeItemDisplay.this, "NEW ITEM ADDED", Toast.LENGTH_SHORT).show();

}
protected void onStart(){
    super.onStart();
    fridgeItemDatabase = FirebaseDatabase.getInstance().getReference("fridgeItems");

    fridgeItemDatabase.addValueEventListener(new ValueEventListener() {
        @Override
        public void onDataChange(@NonNull DataSnapshot snapshot) {
            fridgeItems.clear();
            for (DataSnapshot postSnapshot : snapshot.getChildren()){
                FridgeItem fridgeItem = postSnapshot.getValue(FridgeItem.class);
                fridgeItems.add(fridgeItem);
            }
            FridgeItemAdapter fridgeItemAdapter = new FridgeItemAdapter(FridgeItemDisplay.this, fridgeItems);
            fridgeItemList.setAdapter(fridgeItemAdapter);
        }

        @Override
        public void onCancelled(@NonNull DatabaseError error) {

        }
    });
}
}
