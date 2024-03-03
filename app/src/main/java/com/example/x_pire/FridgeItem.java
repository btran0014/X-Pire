package com.example.x_pire;

public class FridgeItem {
    private String itemName, itemExpiryDate, itemID, itemLogDate;
    private int itemExpiryInt, itemQuantity;

    public FridgeItem(){}
    public FridgeItem(String itemID, String itemName,String itemLogDate, String itemExpiryDate, int itemExpiryInt, int itemQuantity){
        this.itemID = itemID;
        this.itemName = itemName;
        this.itemLogDate=itemLogDate;
        this.itemExpiryDate = itemExpiryDate;
        this.itemExpiryInt=itemExpiryInt;
        this.itemQuantity = itemQuantity;
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
    public void setItemExpiryInt(int input){
        this.itemExpiryInt = input;
    }
    public void setItemQuantity(int input){this.itemQuantity = input;}

    public String getItemName(){
        return itemName;
    }
    public String getItemLogDate(){
        return itemLogDate;
    }
    public String getItemExpiryDate(){
        return itemExpiryDate;
    }
    public int getItemExpiryInt(){return itemExpiryInt;}
    public String getItemID(){
        return itemID;
    }
    public int getItemQuantity(){return itemQuantity;}

    public void decreaseQuantity(){itemQuantity--;}
}
