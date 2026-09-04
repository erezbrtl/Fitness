/* איורי תרגילים — דמות וקטורית מונפשת, נבנית מנקודות מפרק.
   מערך תנוחה: [hx,hy, nx,ny, px,py, sw,hw, e1x,e1y,w1x,w1y, e2x,e2y,w2x,w2y,
                 k1x,k1y,a1x,a1y, k2x,k2y,a2x,a2y, mx,my]
   h=ראש  n=מפרק כתפיים  p=אגן  sw/hw=חצי רוחב כתפיים/אגן  e/w=מרפק/שורש כף יד
   k/a=ברך/קרסול  m=נקודת אמצע לעמוד השדרה (0,0 = גב ישר)
   מבט צד: הדמות פונה ימינה. מבט חזית: sw>0. הרצפה בגובה y=132. */
(function () {
  const POSES = {
    /* ---- עמידה, מבט חזית ---- */
    stand:        [100,26,100,44,100,80,12,8, 116,62,118,84, 84,62,82,84, 108,104,108,128, 92,104,92,128, 0,0],
    standFeet:    [100,26,100,44,100,80,12,8, 114,64,112,86, 86,64,88,86, 104,104,104,128, 96,104,96,128, 0,0],
    jackOpen:     [100,26,100,44,100,80,12,8, 126,30,138,14, 74,30,62,14, 124,102,136,128, 76,102,64,128, 0,0],
    starLow:      [100,44,100,60,100,88,12,10, 118,74,112,92, 82,74,88,92, 124,108,132,128, 76,108,68,128, 0,0],
    marchKnee:    [100,26,100,44,100,80,12,8, 116,60,110,42, 84,64,88,88, 112,86,124,100, 92,104,92,128, 0,0],
    kneeHigh:     [100,28,100,46,100,82,12,8, 118,60,112,42, 82,64,86,90, 110,78,122,92, 92,106,92,128, 0,0],
    heelBack:     [100,26,100,44,100,80,12,8, 116,60,110,44, 84,64,88,88, 110,102,102,80, 92,104,92,128, 0,0],
    armsSide:     [100,26,100,44,100,80,12,8, 126,48,146,44, 74,48,54,44, 108,104,108,128, 92,104,92,128, 0,0],
    armsSideUp:   [100,26,100,44,100,80,12,8, 128,38,148,26, 72,38,52,26, 108,104,108,128, 92,104,92,128, 0,0],
    handsHips:    [100,26,100,44,100,80,12,8, 122,58,110,74, 78,58,90,74, 108,104,108,128, 92,104,92,128, 0,0],
    hipsTilt:     [105,28,102,46, 96,80,12,8, 124,60,112,76, 80,60, 92,76, 104,104,104,128, 88,104,88,128, 0,0],
    twistSide:    [100,26,100,44,100,80,12,8, 122,58,104,52, 88,60,106,54, 108,104,108,128, 92,104,92,128, 0,0],
    punchOut:     [100,26,100,44,100,80,12,8, 122,54,142,50, 86,58, 96,50, 110,104,112,128, 90,104,88,128, 0,0],
    feetFast:     [100,32,100,50,100,84,12,8, 118,64,114,80, 82,64,86,80, 110,104,114,120, 90,106,86,128, 0,0],
    calfUp:       [100,20,100,38,100,74,12,8, 114,56,116,76, 86,56,84,76, 106,98,106,120, 94,98,94,120, 0,0],
    tuckAir:      [100,30,100,48,100,78,12,8, 122,60,116,78, 78,60,84,78, 116,80,128,94, 84,80,72,94, 0,0],
    skaterSide:   [ 88,34, 94,50,104,80,12,8, 112,62,126,52, 78,64,64,74, 112,104,112,126, 92,96,74,112, 0,0],
    curtsyDown:   [100,30,100,48,100,82,12,8, 118,64,110,80, 82,64,90,80, 112,106,116,128, 96,110,80,124, 0,0],
    sideLungeD:   [100,32,100,50,100,84,12,8, 116,64,108,78, 84,64,92,78, 128,106,136,128, 78,110,62,128, 0,0],
    sumoDown:     [100,40,100,56,100,86,12,10, 116,72,106,88, 84,72,94,88, 128,106,136,128, 72,106,64,128, 0,0],
    shuffleLow:   [ 96,36, 98,52,102,84,12,8, 114,66,108,80, 84,66,88,82, 118,106,128,126, 92,106,84,126, 0,0],

    /* ---- עמידה, מבט צד (פונה ימינה) ---- */
    standSide:    [106,26,100,44,100,80, 3,3, 106,62,108,84, 106,62,108,84, 102,104,102,128, 102,104,102,128, 0,0],
    squatDown:    [110,50, 99,66, 86,94, 3,3, 112,76,128,70, 112,76,128,70, 112,102,100,128, 112,102,100,128, 0,0],
    lungeDown:    [106,30,100,48, 98,84, 3,3, 106,66,108,86, 106,66,108,86, 116,102,118,128, 80,110,68,126, 0,0],
    lungeDeep:    [106,38,100,56, 96,92, 3,3, 104,72,106,92, 104,72,106,92, 114,106,116,128, 76,118,64,128, 0,0],
    slSquatDown:  [108,44,100,60, 92,88, 3,3, 110,72,126,66, 110,72,126,66, 110,104,100,128, 74,100,60,110, 0,0],
    slSquatTop:   [106,26,100,44,100,80, 3,3, 108,60,120,54, 108,60,120,54, 102,104,102,128, 88,94,72,98, 0,0],
    legSwing:     [104,26,100,44,100,80, 3,3, 106,62,108,84, 106,62,108,84, 100,104,100,128, 116,96,132,90, 0,0],
    hinge:        [116,44,104,54, 92,78, 3,3, 112,72,116,92, 112,72,116,92, 96,102,96,128, 96,102,96,128, 0,0],
    deepSquat:    [108,54, 98,68, 90,104, 3,3, 104,84,112,94, 104,84,112,94, 118,98,106,128, 118,98,106,128, 0,0],
    sitCross:     [110,60,102,74, 94,110, 3,3, 108,90,116,110, 108,90,116,110, 76,116,100,120, 76,116,100,120, 0,0],

    /* ---- פלאנק ושכיבות סמיכה (מבט צד) ---- */
    plankHigh:    [150,74,140,80, 96,90, 0,0, 142,102,142,124, 142,102,142,124, 74,106,52,124, 74,106,52,124, 0,0],
    plankScap:    [150,78,140,84, 96,90, 0,0, 142,104,142,124, 142,104,142,124, 74,106,52,124, 74,106,52,124, 0,0],
    pushDown:     [148,90,138,96, 96,102, 0,0, 144,110,142,126, 144,110,142,126, 74,112,52,126, 74,112,52,126, 0,0],
    plankElbow:   [148,80,138,86, 96,94, 0,0, 140,122,158,124, 140,122,158,124, 74,108,52,124, 74,108,52,124, 0,0],
    kneePushTop:  [150,78,140,84,104,94, 0,0, 142,104,142,124, 142,104,142,124, 82,118,60,106, 82,118,60,106, 0,0],
    kneePushDown: [148,92,138,98,104,104, 0,0, 144,112,142,126, 144,112,142,126, 82,120,60,108, 82,120,60,108, 0,0],
    pikeTop:      [140,86,132,82, 96,52, 0,0, 144,104,148,124, 144,104,148,124, 74,88,56,124, 74,88,56,124, 0,0],
    pikeDown:     [148,108,138,98, 96,54, 0,0, 146,114,150,126, 146,114,150,126, 74,88,56,124, 74,88,56,124, 0,0],
    downDog:      [138,84,130,78, 96,44, 0,0, 142,102,148,124, 142,102,148,124, 76,84,56,124, 76,84,56,124, 0,0],
    cobraUp:      [148,62,138,72, 96,112, 0,0, 142,94,142,124, 142,94,142,124, 70,118,46,122, 70,118,46,122, 0,0],
    planche:      [150,80,140,86, 98,92, 0,0, 128,104,124,124, 128,104,124,124, 74,106,52,124, 74,106,52,124, 0,0],
    archerLean:   [150,84,140,90, 96,94, 0,0, 148,106,150,126, 120,104,102,124, 74,108,52,124, 74,108,52,124, 0,0],
    mcKnee:       [150,74,140,80, 98,90, 0,0, 142,102,142,124, 142,102,142,124, 116,98,128,110, 74,106,52,124, 0,0],
    mcCross:      [150,76,140,82, 98,90, 0,0, 142,102,142,124, 142,102,142,124, 114,104,126,116, 74,106,52,124, 0,0],
    shoulderTap:  [150,74,140,80, 96,90, 0,0, 128,94,134,80, 142,102,142,124, 74,106,52,124, 74,106,52,124, 0,0],
    plankReachA:  [150,74,140,80, 96,90, 0,0, 156,88,174,82, 142,102,142,124, 74,106,52,124, 74,106,52,124, 0,0],
    bearHigh:     [148,80,138,86, 96,92, 0,0, 140,104,140,124, 140,104,140,124, 88,108,72,124, 88,108,72,124, 0,0],
    bearStep:     [148,80,138,86, 96,92, 0,0, 148,102,154,120, 140,104,140,124, 96,104,84,120, 88,108,72,124, 0,0],
    plankJackW:   [150,76,140,82, 96,90,0,10, 142,102,142,124, 142,102,142,124, 76,112,54,132, 76,100,54,114, 0,0],
    foldOver:     [122,94,116,86, 98,58, 0,0, 126,106,132,124, 126,106,132,124, 94,94,92,126, 94,94,92,126, 0,0],
    walkoutMid:   [136,84,128,84, 96,72, 0,0, 134,102,138,124, 134,102,138,124, 84,96,68,124, 84,96,68,124, 0,0],
    sidePlank:    [152,58,144,66,104,96, 0,0, 140,110,156,116, 146,48,150,30, 76,110,50,124, 76,110,50,124, 0,0],
    sidePlankLow: [152,70,144,78,104,108, 0,0, 140,116,156,120, 146,60,150,42, 76,116,50,126, 76,116,50,126, 0,0],
    hipDipDown:   [148,84,138,90, 96,106, 0,0, 140,122,158,124, 140,122,158,124, 74,114,52,124, 74,114,52,124, 0,0],
    crabUp:       [136,66,130,74, 96,84, 0,0, 142,98,148,122, 142,98,148,122, 82,96,78,124, 82,96,78,124, 0,0],
    crabDown:     [136,78,130,86, 96,104, 0,0, 146,108,150,124, 146,108,150,124, 82,106,78,124, 82,106,78,124, 0,0],

    /* ---- שכיבה על הבטן ---- */
    proneFlat:    [148,104,138,108, 96,116, 0,0, 158,112,176,110, 158,112,176,110, 70,118,46,120, 70,118,46,120, 0,0],
    supermanUp:   [146,90,138,98, 96,112, 0,0, 158,94,178,86, 158,94,178,86, 70,110,46, 98, 70,110,46, 98, 0,0],
    proneRow:     [146,94,138,100, 96,112, 0,0, 152,112,136,102, 152,112,136,102, 70,116,46,118, 70,116,46,118, 0,0],
    proneY:       [146,96,138,102, 96,114, 0,0, 158,98,176,88, 158,98,176,88, 70,118,46,120, 70,118,46,120, 0,0],
    proneT:       [146,96,138,102, 96,114, 0,0, 150,110,152,128, 150,110,152,128, 70,118,46,120, 70,118,46,120, 0,0],
    proneW:       [146,96,138,102, 96,114, 0,0, 156,114,144,100, 156,114,144,100, 70,118,46,120, 70,118,46,120, 0,0],
    swimKick:     [146,94,138,100, 96,112, 0,0, 160,96,178,88, 152,112,136,104, 70,104,48, 92, 70,118,46,120, 0,0],
    proneTwist:   [140,92,134,100, 96,114, 0,0, 152,104,150,88, 148,112,158,124, 70,116,46,118, 70,116,46,118, 0,0],
    scorpionTw:   [148,104,138,110, 96,116, 0,0, 158,120,176,124, 158,120,176,124, 74,104,96, 92, 70,118,46,120, 0,0],

    /* ---- שכיבה על הגב ---- */
    supineFlat:   [148,112,138,116, 96,120, 0,0, 150,124,166,124, 150,124,166,124, 70,120,46,120, 70,120,46,120, 0,0],
    kneesUp:      [148,112,138,116, 96,120, 0,0, 152,110,144,100, 152,110,144,100, 76, 98,54,120, 76, 98,54,120, 0,0],
    crunchUp:     [140, 92,132,102, 96,120, 0,0, 146, 94,138, 86, 146, 94,138, 86, 76, 98,54,120, 76, 98,54,120, 0,0],
    reachToes:    [136, 86,130, 98, 96,120, 0,0, 122, 84,106, 76, 122, 84,106, 76, 88, 96,74, 72, 88, 96,74, 72, 0,0],
    legsUp:       [148,112,138,116, 96,120, 0,0, 150,124,166,124, 150,124,166,124, 92, 90,88, 60, 92, 90,88, 60, 0,0],
    legsLow:      [148,112,138,116, 96,120, 0,0, 150,124,166,124, 150,124,166,124, 72,116,48,112, 72,116,48,112, 0,0],
    flutterA:     [148,110,138,114, 96,118, 0,0, 150,124,166,124, 150,124,166,124, 74,110,50, 98, 72,120,48,124, 0,0],
    deadBugA:     [146,110,138,114, 96,120, 0,0, 142, 96,140, 78, 150,122,166,122, 84, 96,92, 78, 70,116,48,112, 0,0],
    hollowHold:   [142,102,134,108, 96,118, 0,0, 154, 96,172, 88, 154, 96,172, 88, 72,108,48, 98, 72,108,48, 98, 0,0],
    hollowRock:   [140, 96,132,104, 96,116, 0,0, 152, 90,170, 82, 152, 90,170, 82, 72,102,48, 90, 72,102,48, 90, 0,0],
    vUpTop:       [130, 86,124, 96, 98,118, 0,0, 112, 84, 96, 76, 112, 84, 96, 76, 80, 96,62, 74, 80, 96,62, 74, 0,0],
    bridgeUp:     [148,112,138,114,100, 94, 0,0, 150,122,166,124, 150,122,166,124, 78, 88,60,122, 78, 88,60,122, 0,0],
    bridgeDown:   [148,112,138,116,100,118, 0,0, 150,124,166,124, 150,124,166,124, 76, 96,58,122, 76, 96,58,122, 0,0],
    bridgeSl:     [148,112,138,114,100, 94, 0,0, 150,122,166,124, 150,122,166,124, 78, 88,60,122, 84, 70,74, 46, 0,0],
    bridgeWalkO:  [148,112,138,114,100, 96, 0,0, 150,122,166,124, 150,122,166,124, 70, 96,48,122, 70, 96,48,122, 0,0],
    revCrunchUp:  [148,110,138,114, 98,112, 0,0, 150,124,166,124, 150,124,166,124, 108, 92,118,106, 108,92,118,106, 0,0],
    bicycleA:     [142, 98,134,106, 96,120, 0,0, 148,100,138, 92, 128,104,110, 96, 84, 96,92, 76, 70,116,48,112, 0,0],
    twistSeatA:   [136, 74,130, 86,104,116, 0,0, 116, 92,102, 86, 116, 92,102, 86, 80, 98,62,116, 80, 98,62,116, 0,0],
    wiperSide:    [148,112,138,116, 96,120, 0,0, 152,126,170,128, 152,126,170,128, 86, 98,68, 88, 86, 98,68, 88, 0,0],
    spinalTwistP: [148,112,138,116, 98,118, 0,0, 152,126,170,128, 152,126,170,128, 82,104,70, 92, 82,104,70, 92, 0,0],
    figure4P:     [148,110,138,114, 98,118, 0,0, 142,104,124,100, 142,104,124,100, 82, 96,60,110, 90,100,72, 96, 0,0],
    chestOpenP:   [148,112,138,116, 96,120, 0,0, 148,128,164,132, 148,128,164,132, 74,118,50,118, 74,118,50,118, 0,0],
    breatheP:     [148,112,138,116, 96,120, 0,0, 140,118,122,116, 140,118,122,116, 76, 98,56,122, 76, 98,56,122, 0,0],
    quadLyingP:   [148,106,138,110, 96,116, 0,0, 132,112,116,110, 132,112,116,110, 82,116,102,106, 74,118,50,120, 0,0],

    /* ---- על שש, כריעה וישיבה ---- */
    quadruped:    [148, 78,138, 84, 92, 86, 0,0, 140,104,140,124, 140,104,140,124, 88,110,88,124, 88,110,88,124, 0,0],
    catRound:     [142, 92,134, 88, 92, 86, 0,0, 138,106,138,124, 138,106,138,124, 88,110,88,124, 88,110,88,124, 114,66],
    cowArch:      [150, 70,140, 80, 92, 88, 0,0, 142,104,142,124, 142,104,142,124, 88,110,88,124, 88,110,88,124, 116,96],
    birdDogOut:   [148, 76,138, 82, 92, 86, 0,0, 156, 70,174, 64, 140,104,140,124, 88,110,88,124, 70, 78,48, 72, 0,0],
    thoracicOpen: [146, 74,138, 82, 92, 86, 0,0, 148, 62,152, 44, 140,104,140,124, 88,110,88,124, 88,110,88,124, 0,0],
    thoracicIn:   [144, 84,138, 88, 92, 86, 0,0, 128, 96,112,102, 140,104,140,124, 88,110,88,124, 88,110,88,124, 0,0],
    childPoseP:   [132,110,124,104, 90,102, 0,0, 146,114,166,120, 146,114,166,120, 88,120,68,124, 88,120,68,124, 0,0],
    kneelHip:     [112, 44,104, 58,100, 88, 3,3, 108, 40,114, 22, 106, 74,110, 92, 124,100,124,126, 78,120,58,126, 0,0],
    kneelLunge:   [110, 52,104, 64,100, 92, 3,3, 106, 80,112, 96, 106, 80,112, 96, 124,104,124,126, 78,122,58,128, 0,0],
    seated9090:   [106, 54,100, 68, 96,110, 0,0, 110, 88,118,108, 110, 88,118,108, 74,116,56,102, 118,114,136,120, 0,0],
    seatedFold:   [118, 74,110, 86, 96,112, 0,0, 100, 92, 80,104, 100, 92, 80,104, 70,116,48,116, 70,116,48,116, 0,0],
    butterflyP:   [100, 58,100, 72,100,116,10,6, 116, 96,108,120, 84, 96, 92,120, 126,114,108,126, 74,114, 92,126, 0,0],
    pigeonP:      [124, 92,116, 98, 96,110, 0,0, 132,110,150,120, 132,110,150,120, 108,120, 86,120, 74,120,50,122, 0,0],
    worldStretch: [118, 62,110, 74, 94, 96, 0,0, 120, 52,126, 34, 104, 92,100,112, 116,106,116,128, 76,116,56,126, 0,0],
    neckTilt:     [ 94, 44,100, 60,100,112,11,6, 116, 48,104, 36, 84, 82, 82,106, 124,118,102,126, 76,118, 96,126, 0,0],
    tricepArm:    [100, 28,100, 46,100, 80,12,8, 114, 20, 92, 26, 84, 34,106, 18, 108,104,108,128, 92,104,92,128, 0,0],
  };

  /* מיפוי תרגיל → [תנוחה א׳, תנוחה ב׳, אפשרויות]
     flipB: תנוחה ב׳ משתקפת אופקית (החלפת צד/ידיים) */
  const MAP = {
    /* חימום */
    jj_warm:['standFeet','jackOpen'], march:['marchKnee','marchKnee',{flipB:1}],
    arm_circles:['armsSide','armsSideUp'], hip_circles:['handsHips','hipsTilt',{flipB:1}],
    inchworm:['foldOver','plankHigh'], catcow_w:['cowArch','catRound'],
    leg_swings:['standSide','legSwing'], slow_squat:['standSide','squatDown'],
    torso_twist:['twistSide','twistSide',{flipB:1}], shoulder_tap_w:['plankHigh','shoulderTap'],
    butt_kicks_w:['heelBack','heelBack',{flipB:1}],
    /* דחיפה */
    knee_pushup:['kneePushTop','kneePushDown'], pushup:['plankHigh','pushDown'],
    wide_pushup:['plankHigh','pushDown'], diamond_pushup:['plankHigh','pushDown'],
    pike_pushup:['pikeTop','pikeDown'], archer_pushup:['plankHigh','archerLean'],
    pseudo_planche:['planche','pushDown'], crab_dips:['crabUp','crabDown'],
    updown:['plankElbow','plankHigh'], hindu_pushup:['downDog','cobraUp'],
    scap_pushup:['plankHigh','plankScap'], pushup_hold:['pushDown','pushDown'],
    /* משיכה */
    superman:['proneFlat','supermanUp'], superman_pull:['proneY','proneRow'],
    ytw:['proneY','proneW'], rev_snow_angel:['proneY','proneT'],
    swimmers:['swimKick','swimKick',{flipB:1}], cobra_lift:['proneFlat','proneT'],
    back_ext_rot:['proneFlat','proneTwist'], prone_pull:['proneY','proneRow'],
    bridge_walk:['bridgeUp','bridgeWalkO'], hamstring_curl_slide:['bridgeSl','bridgeSl'],
    wtw_hold:['supermanUp','supermanUp'],
    /* רגליים */
    squat:['standSide','squatDown'], sumo_squat:['stand','sumoDown'],
    rev_lunge:['standSide','lungeDown'], fwd_lunge:['standSide','lungeDown'],
    jump_squat:['squatDown','jackOpen'], split_pulse:['lungeDown','lungeDeep'],
    shrimp_squat:['slSquatTop','slSquatDown'], pistol:['slSquatTop','slSquatDown'],
    glute_bridge:['bridgeDown','bridgeUp'], sl_bridge:['bridgeDown','bridgeSl'],
    calf_raise:['stand','calfUp'], curtsy:['stand','curtsyDown',{flipB:1}],
    jump_lunge:['lungeDown','lungeDown',{flipB:1}], squat_hold:['squatDown','squatDown'],
    side_lunge:['stand','sideLungeD',{flipB:1}], squat_pulse:['squatDown','deepSquat'],
    pistol_box:['slSquatTop','slSquatDown'], wall_less_sit:['standSide','squatDown'],
    /* ליבה */
    plank:['plankElbow','plankElbow'], side_plank:['sidePlank','sidePlank'],
    dead_bug:['kneesUp','deadBugA',{flipB:1}], bird_dog:['quadruped','birdDogOut',{flipB:1}],
    crunch:['kneesUp','crunchUp'], bicycle:['bicycleA','bicycleA',{flipB:1}],
    leg_raise:['legsLow','legsUp'], flutter:['flutterA','flutterA',{flipB:1}],
    russian_twist:['twistSeatA','twistSeatA',{flipB:1}], hollow_hold:['hollowHold','hollowHold'],
    v_up:['supineFlat','vUpTop'], shoulder_taps:['plankHigh','shoulderTap',{flipB:1}],
    rev_crunch:['kneesUp','revCrunchUp'], hip_dips:['plankElbow','hipDipDown',{flipB:1}],
    hollow_rock:['hollowHold','hollowRock'], side_plank_dip:['sidePlank','sidePlankLow'],
    toe_touch:['legsUp','reachToes'], heel_touch:['crunchUp','crunchUp',{flipB:1}],
    plank_walkout:['foldOver','plankHigh'], wipers:['legsUp','wiperSide',{flipB:1}],
    mc_core:['plankHigh','mcKnee'], plank_reach:['plankHigh','plankReachA',{flipB:1}],
    long_plank:['plankHigh','plankHigh'],
    /* קרדיו */
    jj:['standFeet','jackOpen'], high_knees:['kneeHigh','kneeHigh',{flipB:1}],
    burpee:['plankHigh','jackOpen'], half_burpee:['plankHigh','foldOver'],
    mountain_climber:['mcKnee','mcKnee',{flipB:1}], squat_jump_c:['squatDown','jackOpen'],
    skater:['skaterSide','skaterSide',{flipB:1}], plank_jack:['plankHigh','plankJackW'],
    tuck_jump:['starLow','tuckAir'], butt_kicks:['heelBack','heelBack',{flipB:1}],
    fast_feet:['feetFast','feetFast',{flipB:1}], burpee_pushup:['pushDown','jackOpen'],
    lateral_shuffle:['shuffleLow','shuffleLow',{flipB:1}], star_jump:['starLow','jackOpen'],
    bear_crawl:['bearHigh','bearStep',{flipB:1}], jump_lunge_c:['lungeDown','lungeDown',{flipB:1}],
    cross_mc:['mcCross','mcCross',{flipB:1}], squat_thrust:['foldOver','plankHigh'],
    punches:['punchOut','punchOut',{flipB:1}], sprawl:['standSide','plankHigh'],
    plank_updown_c:['plankElbow','plankHigh'],
    /* ניידות */
    world_greatest:['lungeDeep','worldStretch'], downdog_flow:['downDog','cobraUp'],
    hip_90:['seated9090','seated9090',{flipB:1}], thoracic_rot:['thoracicIn','thoracicOpen'],
    deep_squat_hold:['deepSquat','deepSquat'], scorpion:['proneFlat','scorpionTw',{flipB:1}],
    cat_cow_m:['cowArch','catRound'], sit_stand:['sitCross','standSide'],
    /* שחרור */
    child_pose:['childPoseP','childPoseP'], cobra_stretch:['proneFlat','cobraUp'],
    hamstring_seated:['seatedFold','seatedFold'], pigeon:['pigeonP','pigeonP'],
    quad_lying:['quadLyingP','quadLyingP'], figure4:['figure4P','figure4P'],
    chest_open:['chestOpenP','chestOpenP'], hip_flexor:['kneelLunge','kneelHip'],
    spinal_twist:['spinalTwistP','spinalTwistP'], downdog:['downDog','downDog'],
    butterfly:['butterflyP','butterflyP'], breathing:['breatheP','breatheP'],
    neck_stretch:['neckTilt','neckTilt',{flipB:1}], tricep_stretch:['tricepArm','tricepArm',{flipB:1}],
  };

  const FALLBACK = { warmup:['stand','armsSideUp'], push:['plankHigh','pushDown'], pull:['proneFlat','supermanUp'],
    legs:['standSide','squatDown'], core:['plankElbow','plankElbow'], cardio:['standFeet','jackOpen'],
    mobility:['cowArch','catRound'], cooldown:['childPoseP','childPoseP'] };

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const mk = (tag, attrs) => { const e = document.createElementNS(SVG_NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
  const flipPose = (a) => { const o = a.slice(); for (let i = 0; i < o.length; i += 2) if (i !== 6 && i !== 7) o[i] = 200 - o[i]; return o; };
  const lerp = (a, b, t) => a.map((v, i) => (i === 6 || i === 7 ? Math.max(v, b[i]) : v + (b[i] - v) * t));

  function limbPath(sx, sy, jx, jy, ex, ey) { return `M${sx} ${sy}L${jx} ${jy}L${ex} ${ey}`; }
  function torsoPath(p) {
    const [nx, ny, px, py] = [p[2], p[3], p[4], p[5]];
    const [mx, my] = [p[24], p[25]];
    return mx || my ? `M${nx} ${ny}Q${mx} ${my} ${px} ${py}` : `M${nx} ${ny}L${px} ${py}`;
  }
  const sameLimb = (p, i, j) => p[i] === p[j] && p[i + 1] === p[j + 1];

  function apply(g, p) {
    const sw = p[6], hw = p[7];
    // זרוע/רגל רחוקה מוסטת מעט כשהתנוחה במבט צד, כדי לתת עומק
    const sideView = sw === 0;
    const dx = sideView ? -7 : 0, dy = sideView ? 4 : 0;
    const armFar = sameLimb(p, 8, 12) && sameLimb(p, 10, 14);
    const legFar = sameLimb(p, 16, 20) && sameLimb(p, 18, 22);
    g.head.setAttribute('cx', p[0]); g.head.setAttribute('cy', p[1]);
    g.torso.setAttribute('d', torsoPath(p));
    g.armN.setAttribute('d', limbPath(p[2] + sw, p[3], p[8], p[9], p[10], p[11]));
    g.armF.setAttribute('d', limbPath(p[2] - sw + (armFar ? dx : 0), p[3] + (armFar ? dy : 0), p[12] + (armFar ? dx : 0), p[13] + (armFar ? dy : 0), p[14] + (armFar ? dx : 0), p[15] + (armFar ? dy : 0)));
    g.legN.setAttribute('d', limbPath(p[4] + hw, p[5], p[16], p[17], p[18], p[19]));
    g.legF.setAttribute('d', limbPath(p[4] - hw + (legFar ? dx : 0), p[5] + (legFar ? dy : 0), p[20] + (legFar ? dx : 0), p[21] + (legFar ? dy : 0), p[22] + (legFar ? dx : 0), p[23] + (legFar ? dy : 0)));
  }

  /* יוצר איור. animate=true מפעיל תנועה מחזורית בין שתי התנוחות. */
  function create(ex, opts) {
    opts = opts || {};
    const m = MAP[ex.id] || FALLBACK[ex.cat] || ['stand', 'stand'];
    const o = m[2] || {};
    const A = POSES[m[0]] || POSES.stand;
    let B = POSES[m[1]] || A;
    if (o.flipB) B = flipPose(B);
    const svg = mk('svg', { viewBox: '0 0 200 140', class: 'figure', 'aria-hidden': 'true' });
    const mat = mk('line', { x1: 12, y1: 133, x2: 188, y2: 133, class: 'fig-mat' });
    const g = {
      armF: mk('path', { class: 'fig-limb fig-far' }), legF: mk('path', { class: 'fig-limb fig-far' }),
      torso: mk('path', { class: 'fig-torso' }), head: mk('circle', { r: 10, class: 'fig-head' }),
      armN: mk('path', { class: 'fig-limb' }), legN: mk('path', { class: 'fig-limb' }),
    };
    svg.append(mat, g.armF, g.legF, g.torso, g.legN, g.armN, g.head);
    apply(g, A);
    if (opts.animate && A !== B) {
      const period = opts.period || 2600;
      let raf = 0, t0 = performance.now();
      const frame = (now) => {
        const ph = ((now - t0) % period) / period;             // 0..1
        const tri = ph < 0.5 ? ph * 2 : (1 - ph) * 2;          // הלוך ושוב
        const e = tri * tri * (3 - 2 * tri);                   // האטה בקצוות
        apply(g, lerp(A, B, e));
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
      svg.stop = () => cancelAnimationFrame(raf);
    }
    return svg;
  }

  window.FIGURES = { create, POSES, MAP, has: (id) => !!MAP[id] };
})();
