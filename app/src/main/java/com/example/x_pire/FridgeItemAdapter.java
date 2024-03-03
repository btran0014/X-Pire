package com.example.x_pire;

import android.app.Activity;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.TextView;

import java.util.Iterator;
import java.util.List;

public class FridgeItemAdapter extends ArrayAdapter<FridgeItem> {

    private Activity context;
    private List<FridgeItem> items;
    private OnQuantityDecreaseListener onQuantityDecreaseListener;

    public interface OnQuantityDecreaseListener {
        void onQuantityDecrease(int position);
    }

    public void setOnQuantityDecreaseListener(OnQuantityDecreaseListener listener) {
        this.onQuantityDecreaseListener = listener;
    }

    public FridgeItemAdapter(Activity context, List<FridgeItem> items){
        super(context, R.layout.list_item_template, items);
        this.context = context;
        this.items = items;
    }

    public View getView(final int position, View convertView, ViewGroup parent){
        LayoutInflater inflater = context.getLayoutInflater();
        View listViewItem = inflater.inflate(R.layout.list_item_template, null, true);

        TextView textViewName = listViewItem.findViewById(R.id.itemName);
        TextView textViewLogDate = listViewItem.findViewById(R.id.itemLogDate);
        TextView textViewExpiryDate = listViewItem.findViewById(R.id.itemExpiryDate);
        TextView textViewQuantity = listViewItem.findViewById(R.id.itemQuantity);

        FridgeItem fridgeItem = items.get(position);
        textViewName.setText(fridgeItem.getItemName());
        textViewLogDate.setText(fridgeItem.getItemLogDate());
        textViewExpiryDate.setText(fridgeItem.getItemExpiryDate());
        textViewQuantity.setText("Qty: " + fridgeItem.getItemQuantity());

        Button btnDecQuan = listViewItem.findViewById(R.id.decQuanButton);
        btnDecQuan.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                FridgeItem currentItem = items.get(position);
                currentItem.decreaseQuantity();

                if (currentItem.getItemQuantity() == 0) {
                    removeItem(position);
                }

                notifyDataSetChanged();

                if (onQuantityDecreaseListener != null) {
                    onQuantityDecreaseListener.onQuantityDecrease(position);
                }
            }
        });

        return listViewItem;
    }

    private void removeItem(int position) {
        items.remove(position);
    }
}
