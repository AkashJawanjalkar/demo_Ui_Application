namespace my.packaging;

entity BatchData {
  key BatchNo              : String(30);  // Alpha Numeric, No SPL chars
      ComponentCode        : String(30);  // Alpha Numeric with SPL chars
      PackingSiteIDName    : String(50);  // May include SPL chars

      BatchNoFirstUsedInPkg : String(30);
      DateFirstUsedInPackaging : Date;

      BatchNumberFirstReleased : String(30);
      DateFirstReleaseToMarket : Date;

      BatchNoLastUsedInPkg : String(30);
      DateLastUsedInPackaging : Date;

      BatchNumberLastReleased : String(30);
      DateLastReleaseToMarket : Date;

      Comments : String(255);
}
