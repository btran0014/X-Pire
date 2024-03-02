package com.example.x_pire;

public class FridgeItem {
    private String itemName, itemLogDate, itemExpiryDate, itemID;

    public FridgeItem(String itemID, String itemName, String itemLogDate, String itemExpiryDate){
        this.itemID = itemID;
        this.itemName = itemName;
        this.itemLogDate = itemLogDate;
        this.itemExpiryDate = itemExpiryDate;
    }
    public void setItemName(String input){
        this.itemName = input;
    }

    public void setItemLogDate(String input){
        this.itemLogDate = input;
    }

    public void setItemExpiryDate(String input){
        this.itemExpiryDate = input;
    }

    public String getItemName(){
        return itemName;
    }
    public String getItemLogDate(){
        return itemLogDate;
    }
    public String getItemExpiryDate(){
        return itemExpiryDate;
    }
    public String getItemID(){
        return itemID;
    }
}
