package com.example.x_pire;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;

import android.content.Intent;
import android.graphics.Bitmap;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.widget.AdapterView;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.ListView;
import android.widget.Toast;
import android.widget.Spinner;


import androidx.appcompat.app.AlertDialog;

import java.util.ArrayList;
import java.util.List;
import java.util.*;


import com.google.android.material.dialog.MaterialAlertDialogBuilder;
import com.google.android.material.textfield.TextInputEditText;
import com.google.firebase.database.DataSnapshot;
import com.google.firebase.database.DatabaseError;
import com.google.firebase.database.DatabaseReference;
import com.google.firebase.database.FirebaseDatabase;
import com.google.firebase.database.ValueEventListener;

public class FridgeItemDisplay extends AppCompatActivity implements AdapterView.OnItemSelectedListener{
    private Button btnOpenCamera, btnManualEntry;
    private ListView fridgeItemList;
    private List<FridgeItem> fridgeItems;
    private Spinner sortingType;

    private DatabaseReference fridgeItemDatabase;
    protected void onCreate(Bundle savedInstanceState){
        super.onCreate(savedInstanceState);
        setContentView(R.layout.fridge_items_list);
        btnManualEntry = findViewById(R.id.manualEntryBtn);
        btnOpenCamera = findViewById(R.id.cameraBtn);
        fridgeItemList = findViewById(R.id.fridgeItemList);
        fridgeItems = new ArrayList<>();
        Spinner spinner = findViewById(R.id.sortTypeSpinner);

        ArrayAdapter<CharSequence> adapter = ArrayAdapter.createFromResource(this, R.array.sorting_types,android.R.layout.simple_spinner_item);
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        spinner.setAdapter(adapter);
        spinner.setOnItemSelectedListener(this);
        fridgeItemDatabase = FirebaseDatabase.getInstance().getReference("fridgeItems");

        btnOpenCamera.setOnClickListener(v -> CameraHelper.openCamera(FridgeItemDisplay.this));
        btnManualEntry.setOnClickListener(new View.OnClickListener(){
            public void onClick(View view){
                manualEntryPopup();
            }
        });



        FridgeItemAdapter.OnQuantityDecreaseListener listener = new FridgeItemAdapter.OnQuantityDecreaseListener() {
            @Override
            public void onQuantityDecrease(int position) {
                // Update the quantity in Firebase database
                FridgeItem currentItem = fridgeItems.get(position);
                fridgeItemDatabase.child(currentItem.getItemID()).child("itemQuantity").setValue(currentItem.getItemQuantity());
            }
        };

        // Set the listener to the adapter
        FridgeItemAdapter fridgeItemAdapter = new FridgeItemAdapter(this, fridgeItems);
        fridgeItemAdapter.setOnQuantityDecreaseListener(listener);
        fridgeItemList.setAdapter(fridgeItemAdapter);
    }
    private void manualEntryPopup(){
        AlertDialog.Builder createDialogBuilder = new AlertDialog.Builder(this);
        LayoutInflater creationInflater = getLayoutInflater();
        final View createDialogView = creationInflater.inflate(R.layout.item_manual_entry, null);
        createDialogBuilder.setView(createDialogView);

        Button cancel = (Button) createDialogView.findViewById(R.id.cancelBtn);
        Button save = (Button) createDialogView.findViewById(R.id.saveBtn);

        TextInputEditText itemName = (TextInputEditText) createDialogView.findViewById(R.id.itemNameInput);
        TextInputEditText itemLogDate = (TextInputEditText) createDialogView.findViewById(R.id.itemLogDateInput);
        TextInputEditText itemQuantity = (TextInputEditText) createDialogView.findViewById(R.id.itemQuantityInput);

        final AlertDialog createMenuBuilder = createDialogBuilder.create();
        createMenuBuilder.show();

        save.setOnClickListener(new View.OnClickListener(){
            public void onClick(View view){
                String fridgeItemName = itemName.getText().toString().trim();
                String fridgeItemLogDate = itemLogDate.getText().toString().trim();
                int fridgeItemQuantity = Integer.parseInt(itemQuantity.getText().toString());


                createFridgeItem(fridgeItemName,fridgeItemLogDate,"10/22/2024",10222024,fridgeItemQuantity);
                Toast.makeText(FridgeItemDisplay.this, "WORKS HERE", Toast.LENGTH_SHORT).show();
                createMenuBuilder.dismiss();
            }
        });

        cancel.setOnClickListener(new View.OnClickListener(){

            public void onClick(View view){
                createMenuBuilder.dismiss();
            }
        });


    }

    private void editItemPopup(int i){
        FridgeItem currentItem = fridgeItems.get(i);
        AlertDialog.Builder editDialogBuilder = new AlertDialog.Builder(this);
        LayoutInflater editInflater = getLayoutInflater();
        final View editDialogView = editInflater.inflate(R.layout.item_edit_popup, null);
        editDialogBuilder.setView(editDialogView);


        Button cancel = (Button) editDialogView.findViewById(R.id.cancelBtn);
        Button save = (Button) editDialogView.findViewById(R.id.saveBtn);
        Button delete = (Button) editDialogView.findViewById(R.id.deleteBtn);

        TextInputEditText itemName = (TextInputEditText) editDialogView.findViewById(R.id.itemNameInput);
        TextInputEditText itemLogDate = (TextInputEditText) editDialogView.findViewById(R.id.itemLogDateInput);
        TextInputEditText itemQuantity = (TextInputEditText) editDialogView.findViewById(R.id.itemQuantityInput);
        TextInputEditText itemExpiryDate = (TextInputEditText) editDialogView.findViewById(R.id.itemExpiryInput);
        TextInputEditText itemExpiryDateInt = (TextInputEditText) editDialogView.findViewById(R.id.itemExpiryIntInput);

        itemName.setText(currentItem.getItemName());
        itemLogDate.setText(currentItem.getItemLogDate());
        itemQuantity.setText(currentItem.getItemQuantity());

        final AlertDialog editMenuBuilder = editDialogBuilder.create();
        editMenuBuilder.show();

        cancel.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                editMenuBuilder.dismiss();
            }
        });

        delete.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                DatabaseReference dR = FirebaseDatabase.getInstance().getReference("fridgeItems").child(currentItem.getItemID());
                dR.removeValue();
                Toast.makeText(FridgeItemDisplay.this, "ITEM DELETED", Toast.LENGTH_SHORT).show();
                editMenuBuilder.dismiss();

            }
        });

        save.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                String newItemName = itemName.getText().toString().trim();
                String newItemLogDate = itemLogDate.getText().toString().trim();
                int newItemQuantity = Integer.parseInt(itemQuantity.getText().toString());
                String newItemExpiryDate = itemExpiryDate.getText().toString().trim();
                int newItemExpiryDateInt = Integer.parseInt(itemExpiryDateInt.getText().toString());

                String currentItemID = currentItem.getItemID();
                FridgeItem replaceFridgeItem = new FridgeItem(currentItemID,newItemName,newItemLogDate,newItemExpiryDate,newItemExpiryDateInt,newItemQuantity);
                fridgeItemDatabase.child(currentItemID).setValue(replaceFridgeItem);
                Toast.makeText(FridgeItemDisplay.this, "Item Updated", Toast.LENGTH_SHORT).show();
                editMenuBuilder.dismiss();




            }
        });

    }


    @Override
    protected void onActivityResult(int requestCode, int resultCode, @Nullable Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        Bitmap photo = CameraHelper.processActivityResult(requestCode, resultCode, data);
        if (photo != null) {

        } else {
            Toast.makeText(this, "Canceled", Toast.LENGTH_SHORT).show();
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        CameraHelper.onRequestPermissionsResult(this, requestCode, permissions, grantResults);
    }
    private void removeFridgeItem(int i){
        FridgeItem currentItem = fridgeItems.get(i);
        DatabaseReference dR = FirebaseDatabase.getInstance().getReference("fridgeItems").child(currentItem.getItemID());
        dR.removeValue();
        Toast.makeText(FridgeItemDisplay.this, "Removed Item", Toast.LENGTH_SHORT).show();

    }
    private void createFridgeItem(String itemName, String itemLogDate, String itemExpiryDate, int itemExpiryInt, int itemQuantity){
        Toast.makeText(FridgeItemDisplay.this, "WORKS HERE", Toast.LENGTH_SHORT).show();
        String fridgeItemID = fridgeItemDatabase.push().getKey();
        FridgeItem addFridgeItem = new FridgeItem(fridgeItemID, itemName, itemLogDate, itemExpiryDate,itemExpiryInt, itemQuantity);
        fridgeItemDatabase.child(fridgeItemID).setValue(addFridgeItem);
        Toast.makeText(FridgeItemDisplay.this, "NEW ITEM ADDED", Toast.LENGTH_SHORT).show();

    }

    protected void onStart(){
        super.onStart();
        fridgeItemDatabase = FirebaseDatabase.getInstance().getReference("fridgeItems");

        fridgeItemDatabase.addValueEventListener(new ValueEventListener() {

            public void onDataChange(DataSnapshot dataSnapshot) {
                Toast.makeText(FridgeItemDisplay.this, "WORKS HERE", Toast.LENGTH_SHORT).show();
                fridgeItems.clear();
                for (DataSnapshot postSnapshot : dataSnapshot.getChildren()){
                    FridgeItem fridgeItem = postSnapshot.getValue(FridgeItem.class);
                    fridgeItems.add(fridgeItem);
                }
                FridgeItemAdapter fridgeItemAdapter = new FridgeItemAdapter(FridgeItemDisplay.this, fridgeItems);
                fridgeItemList.setAdapter(fridgeItemAdapter);
            }


            public void onCancelled( DatabaseError databaseError) {

            }
        });
    }

    @Override
    public void onItemSelected(AdapterView<?> parent, View view, int position, long id) {
        String selected_type = parent.getItemAtPosition(position).toString();
        Toast.makeText(parent.getContext(),selected_type, Toast.LENGTH_SHORT).show();
        if(selected_type.equals("Alphabetical")) {
            Collections.sort(fridgeItems, Comparator.comparing(FridgeItem::getItemName));
        } else if(selected_type.equals("Expiry Date")) {
            Collections.sort(fridgeItems, Comparator.comparing(FridgeItem::getItemExpiryInt));
        } else if(selected_type.equals("Quantity")) {
            Collections.sort(fridgeItems, Comparator.comparing(FridgeItem::getItemQuantity).reversed());
        } else {
            Collections.sort(fridgeItems, Comparator.comparing(FridgeItem::getItemLogDateInt).reversed());
        }
        FridgeItemAdapter fridgeItemAdapter = new FridgeItemAdapter(FridgeItemDisplay.this, fridgeItems);
        fridgeItemList.setAdapter(fridgeItemAdapter);
    }

    @Override
    public void onNothingSelected(AdapterView<?> parent) {

    }

}
