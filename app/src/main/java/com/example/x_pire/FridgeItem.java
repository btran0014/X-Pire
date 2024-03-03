package com.example.x_pire;

import java.util.Locale;

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
        return itemName.toLowerCase(Locale.ROOT);
    }
    public String getItemLogDate(){
        return itemLogDate;
    }
    public String getItemExpiryDate(){
        return itemExpiryDate;
    }
    public int getItemExpiryInt(){
        String date = getItemExpiryDate();
        String[] values = date.split("/");
        int month = Integer.parseInt(values[0]);
        int day = Integer.parseInt(values[1]);
        int year = Integer.parseInt(values[2]);
        switch(month){
            case 1:
            case 3:
            case 5:
            case 7:
            case 8:
            case 10:
            case 12:
                month *= 31;
                break;
            case 2:
                month *= 28;
                break;
            default:
                month *= 30;
        }
        return 365*year+ month + day;
    }

    public int getItemLogDateInt() {
        String date = getItemExpiryDate();
        String[] values = date.split("/");
        int month = Integer.parseInt(values[0]);
        int day = Integer.parseInt(values[1]);
        int year = Integer.parseInt(values[2]);
        switch(month){
            case 1:
            case 3:
            case 5:
            case 7:
            case 8:
            case 10:
            case 12:
                month *= 31;
                break;
            case 2:
                month *= 28;
                break;
            default:
                month *= 30;
        }
        return 365*year+ month + day;
    }
    public String getItemID(){
        return itemID;
    }
    public int getItemQuantity(){return itemQuantity;}

    public void decreaseQuantity(){itemQuantity--;}
}
