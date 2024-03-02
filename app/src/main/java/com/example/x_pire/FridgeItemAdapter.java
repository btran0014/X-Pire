package com.example.x_pire;

import android.app.Activity;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ArrayAdapter;
import android.widget.TextView;

import java.util.List;
public class FridgeItemAdapter extends ArrayAdapter<String>{

    private Activity context;
    List<FridgeItem> items;

    public FridgeItemAdapter(Activity context, List items){
        super(context, R.layout.list_item_template);
        this.context=context;
        this.items=items;
    }
    public View getView(int position, View convertView, ViewGroup parent){
        LayoutInflater inflater = context.getLayoutInflater();
        View listViewItem = inflater.inflate(R.layout.list_item_template, null, true);

        TextView textViewName = (TextView) listViewItem.findViewById(R.id.itemName);
        TextView textViewLogDate = (TextView) listViewItem.findViewById(R.id.itemLogDate);
        TextView textViewExpiryDate = (TextView) listViewItem.findViewById(R.id.itemExpiryDate);

        FridgeItem fridgeItem = items.get(position);
        return listViewItem;
    }
}
