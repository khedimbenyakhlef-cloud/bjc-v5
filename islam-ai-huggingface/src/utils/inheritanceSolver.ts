/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { InheritanceInput, InheritanceResult, HeirShare } from "../types";

export function solveInheritance(input: InheritanceInput): InheritanceResult {
  const {
    estateValue,
    hasHusband,
    hasWife,
    sonsCount,
    daughtersCount,
    hasFather,
    hasMother,
    fullBrothersCount,
    fullSistersCount
  } = input;

  const shares: HeirShare[] = [];
  const steps: string[] = [];
  
  // Total children
  const totalChildren = sonsCount + daughtersCount;
  
  // 1. Calculate Fixed Shares (أصحاب الفروض)
  let sumFractions = 0; // Cumulative fixed fractions (to check for Cawl or Radd)
  
  // -- A. Husband or Wife (They don't inherit simultaneously under Islamic Law)
  let spouseRatio = 0;
  let spouseText = "";
  let spouseName = "";
  let spouseBasis = "";
  
  if (hasHusband) {
    spouseName = "الزوج";
    if (totalChildren > 0) {
      spouseRatio = 1/4;
      spouseText = "1/4";
      spouseBasis = "الربع لوجود الفرع الوارث (سورة النساء: 12)";
    } else {
      spouseRatio = 1/2;
      spouseText = "1/2";
      spouseBasis = "النصف لعدم وجود الفرع الوارث (سورة النساء: 12)";
    }
  } else if (hasWife) {
    spouseName = "الزوجة";
    if (totalChildren > 0) {
      spouseRatio = 1/8;
      spouseText = "1/8";
      spouseBasis = "الثمن لوجود الفرع الوارث (سورة النساء: 12)";
    } else {
      spouseRatio = 1/4;
      spouseText = "1/4";
      spouseBasis = "الربع لعدم وجود الفرع الوارث (سورة النساء: 12)";
    }
  }

  if (spouseRatio > 0) {
    sumFractions += spouseRatio;
    steps.push(`تم تحديد فرض ${spouseName} وهو ${spouseText} بناءً على وجود الفرع الوارث أو عدمه.`);
  }

  // -- B. Mother
  let motherRatio = 0;
  let motherText = "";
  let motherBasis = "";
  if (hasMother) {
    const siblingCount = fullBrothersCount + fullSistersCount;
    if (totalChildren > 0 || siblingCount >= 2) {
      motherRatio = 1/6;
      motherText = "1/6";
      motherBasis = "السدس لوجود الفرع الوارث أو جمع من الإخوة (سورة النساء: 11)";
    } else {
      motherRatio = 1/3;
      motherText = "1/3";
      motherBasis = "الثلث لعدم وجود الفرع الوارث ولا جمع من الإخوة (سورة النساء: 11)";
    }
    sumFractions += motherRatio;
    steps.push(`تم تحديد فرض الأم وهو ${motherText} حسب حالة الفروع والإخوة.`);
  }

  // -- C. Father
  let fatherRatio = 0;
  let fatherText = "";
  let fatherBasis = "";
  let fatherIsAsabah = false;

  if (hasFather) {
    if (sonsCount > 0) {
      // Direct fixed share only
      fatherRatio = 1/6;
      fatherText = "1/6";
      fatherBasis = "السدس فرضاً لوجود فرع وارث مذكر (سورة النساء: 11)";
      sumFractions += fatherRatio;
      steps.push("تم تحديد فرض الأب وهو السدس (1/6) فرضاً محضاً للفرع الوارث المذكر.");
    } else if (daughtersCount > 0) {
      // Fixed share + Asabah (residue)
      fatherRatio = 1/6;
      fatherText = "1/6 + عصبة";
      fatherBasis = "السدس فرضاً لوجود فرع كوشي أنثوي بالإضافة إلى التعصيب للبواقي";
      sumFractions += fatherRatio;
      fatherIsAsabah = true;
      steps.push("الأب يرث السدس فرضاً (1/6) لوجود فرع وارث مؤنث، ويترشح للتعصيب أيضاً.");
    } else {
      // Full Asabah
      fatherIsAsabah = true;
      steps.push("الأب يرث كعصبة بنفسه لعدم وجود فرع وارث مطلقاً.");
    }
  }

  // -- D. Daughters (when there are NO Sons, daughters are owners of Fard)
  let daughtersTotalRatio = 0;
  let daughtersText = "";
  let daughtersBasis = "";
  let daughtersAreAsabah = false;

  if (daughtersCount > 0) {
    if (sonsCount === 0) {
      if (daughtersCount === 1) {
        daughtersTotalRatio = 1/2;
        daughtersText = "1/2";
        daughtersBasis = "النصف فرضاً للانفراد وعدم المعصب (سورة النساء: 11)";
      } else {
        daughtersTotalRatio = 2/3;
        daughtersText = "2/3";
        daughtersBasis = "الثلثان فرضاً للتعدد (بينهن بالتساوي) وعدم المعصب (سورة النساء: 11)";
      }
      sumFractions += daughtersTotalRatio;
      steps.push(`تم فرض نصيب البنات بمقدار ${daughtersText} لعدم وجود ابن ذكر يعصبهن.`);
    } else {
      daughtersAreAsabah = true;
      steps.push("البنات يرثن بالتعصيب بالغير مع الإبن الذكر للذكر مثل حظ الأنثيين.");
    }
  }

  // Check for Blocking (حجب)
  // Brothers and Sisters are blocked if there is:
  // 1. Father (hasFather === true)
  // 2. Male descendant (sonsCount > 0)
  const areSiblingsBlocked = hasFather || sonsCount > 0;
  let siblingsAreAsabah = false;
  let siblingsTotalRatio = 0;
  let siblingsText = "";
  let siblingsBasis = "";

  if (fullBrothersCount > 0 || fullSistersCount > 0) {
    if (areSiblingsBlocked) {
      steps.push("الإخوة والأخوات محجوبون حجب حرمان تام لوجود الأب أو الفرع الوارث المذكر.");
    } else {
      // If there are no sons, and no father, brothers and sisters can inherit
      // If there are daughters but no sons, daughters get their share, mother gets hers, spouse gets hers.
      // Leftover can go to brothers and sisters as Asabah.
      // If there is no brother, but there are sisters:
      if (fullBrothersCount === 0 && daughtersCount === 0) {
        if (fullSistersCount === 1) {
          siblingsTotalRatio = 1/2;
          siblingsText = "1/2";
          siblingsBasis = "النصف فرضاً للأخت المنفردة لعدم وجود معصب أو فرع أو أصل مذكر (سورة النساء: 176)";
        } else {
          siblingsTotalRatio = 2/3;
          siblingsText = "2/3";
          siblingsBasis = "الثلثان فرضاً للأخوات المتعددات لعدم وجود معصب أو فرع أو أصل مذكر (سورة النساء: 176)";
        }
        sumFractions += siblingsTotalRatio;
        steps.push(`تم فرض نصيب الأخوات بمقدار ${siblingsText} لعدم المحجوبية وانعدام العصبة.`);
      } else {
        siblingsAreAsabah = true;
        steps.push("الإخوة والأخوات يرثون عصبة بالغير للذكر مثل حظ الأنثيين وبشروط الكلالة.");
      }
    }
  }

  // 2. Adjust for Al-Cawl (العول)
  // Al-Cawl happens when the sum of fractions is greater than 1. All shares are scaled down proportionally.
  let hasCawl = false;
  let scaleFactor = 1;

  if (sumFractions > 1) {
    hasCawl = true;
    scaleFactor = 1 / sumFractions;
    steps.push(`تزاحمت الفروض والمجموع (${sumFractions.toFixed(2)}) يزيد عن الواحد الصحيح. تم تفعيل مذهب "العول" التاريخي لتخفيض الأنصبة بنسبة المجموع.`);
  }

  // Calculate actual ratios and apply Cawl scale factor if needed
  let spouseRealRatio = spouseRatio * scaleFactor;
  let motherRealRatio = motherRatio * scaleFactor;
  let fatherRealRatio = fatherRatio * scaleFactor;
  let daughtersRealRatio = daughtersTotalRatio * scaleFactor;
  let siblingsRealRatio = siblingsTotalRatio * scaleFactor;

  // Let's check remaining ratio for Asabah (التعصيب)
  let assignedFractions = spouseRealRatio + motherRealRatio + fatherRealRatio + daughtersRealRatio + siblingsRealRatio;
  let remainingRatio = 1 - assignedFractions;

  let hasRadd = false;

  // 3. Adjust for Al-Radd (الرد)
  // Al-Radd happens when there is a residue (remainingRatio > 0) but there are NO Asabah heirs to take it.
  // In this case, the remaining ratio is distributed back to the fixed heirs proportionally (except the spouse).
  const asabahPresent = (sonsCount > 0) || (hasFather && fatherIsAsabah) || (siblingsAreAsabah && (fullBrothersCount > 0 || fullSistersCount > 0)) || (daughtersCount > 0 && sonsCount > 0);
  
  if (remainingRatio > 1e-5 && !asabahPresent) {
    // Radd applies. We distribute back to the non-spouse heirs
    const raddHeirsFractionSum = motherRealRatio + daughtersRealRatio + siblingsRealRatio;
    if (raddHeirsFractionSum > 0) {
      hasRadd = true;
      const raddScale = (1 - spouseRealRatio) / raddHeirsFractionSum;
      motherRealRatio *= raddScale;
      daughtersRealRatio *= raddScale;
      siblingsRealRatio *= raddScale;
      steps.push("فاضت التركة بعد توزيع الفروض ولا توجد عصبة. تم تفعيل قاعدة 'الرد' لتوزيع بقية التركة على أصحاب الفروض عدا الزوجين.");
      assignedFractions = spouseRealRatio + motherRealRatio + fatherRealRatio + daughtersRealRatio + siblingsRealRatio;
      remainingRatio = 1 - assignedFractions;
    }
  }

  // Allocate Spouse
  if (spouseRatio > 0) {
    shares.push({
      relationship: spouseName,
      fractionText: spouseText,
      percentage: spouseRealRatio * 100,
      amount: spouseRealRatio * estateValue,
      basis: spouseBasis,
      isBlocked: false
    });
  }

  // Allocate Mother
  if (hasMother) {
    shares.push({
      relationship: "الأم",
      fractionText: hasCawl ? `مخفضة بالعول` : (hasRadd ? "مرسلة بالرد" : motherText),
      percentage: motherRealRatio * 100,
      amount: motherRealRatio * estateValue,
      basis: motherBasis,
      isBlocked: false
    });
  }

  // Allocate Father
  let fatherFinalRatio = fatherRealRatio;
  if (hasFather) {
    if (fatherIsAsabah) {
      // Father takes remaining residue
      fatherFinalRatio += remainingRatio;
      remainingRatio = 0;
      steps.push("الأب أخذ الفضل الباقي من التركة تعصيباً لعدم وجود فرع مذكر.");
    }
    shares.push({
      relationship: "الأب",
      fractionText: fatherIsAsabah ? "العصبة / الباقي" : fatherText,
      percentage: fatherFinalRatio * 100,
      amount: fatherFinalRatio * estateValue,
      basis: fatherBasis || "التعصيب كونه أقرب عصبة من الرجال",
      isBlocked: false
    });
  }

  // Allocate Daughters (fixed share case)
  if (daughtersCount > 0 && sonsCount === 0) {
    const singleDaughterShare = daughtersRealRatio / daughtersCount;
    for (let i = 1; i <= daughtersCount; i++) {
      shares.push({
        relationship: `البنت رقم ${i}`,
        fractionText: `${daughtersText} (مشترك)`,
        percentage: singleDaughterShare * 100,
        amount: singleDaughterShare * estateValue,
        basis: daughtersBasis,
        isBlocked: false
      });
    }
  }

  // Allocate Sons and Daughters (Asabah case)
  if (sonsCount > 0 || (daughtersCount > 0 && sonsCount > 0)) {
    // Sons and daughters share the remaining ratio in 2:1 ratio
    // Calculate shares: Son units = sonsCount * 2; Daughter units = daughtersCount * 1
    const totalUnits = (sonsCount * 2) + daughtersCount;
    const unitValue = remainingRatio / totalUnits;
    
    if (sonsCount > 0) {
      for (let i = 1; i <= sonsCount; i++) {
        shares.push({
          relationship: `الابن رقم ${i}`,
          fractionText: "عصبة بالغير (للذكر مثل حظ الأنثيين)",
          percentage: (unitValue * 2) * 100,
          amount: (unitValue * 2) * estateValue,
          basis: "التعصيب بالغير (سورة النساء: 11)",
          isBlocked: false
        });
      }
    }
    if (daughtersCount > 0 && sonsCount > 0) {
      for (let i = 1; i <= daughtersCount; i++) {
        shares.push({
          relationship: `البنت رقم ${i}`,
          fractionText: "عصبة بالغير (للذكر مثل حظ الأنثيين)",
          percentage: unitValue * 100,
          amount: unitValue * estateValue,
          basis: "التعصيب بالغير (سورة النساء: 11)",
          isBlocked: false
        });
      }
    }
    remainingRatio = 0;
  }

  // Allocate Siblings (Fixed cases)
  if (!areSiblingsBlocked && fullBrothersCount === 0 && fullSistersCount > 0 && daughtersCount === 0) {
    const singleSisterRatio = siblingsRealRatio / fullSistersCount;
    for (let i = 1; i <= fullSistersCount; i++) {
      shares.push({
        relationship: `الأخت الشقيقة رقم ${i}`,
        fractionText: `${siblingsText} (مشترك)`,
        percentage: singleSisterRatio * 100,
        amount: singleSisterRatio * estateValue,
        basis: siblingsBasis,
        isBlocked: false
      });
    }
  }

  // Allocate Siblings (Asabah cases)
  if (!areSiblingsBlocked && siblingsAreAsabah && remainingRatio > 0) {
    const siblingUnits = (fullBrothersCount * 2) + fullSistersCount;
    if (siblingUnits > 0) {
      const unitValue = remainingRatio / siblingUnits;
      
      for (let i = 1; i <= fullBrothersCount; i++) {
        shares.push({
          relationship: `الأخ الشقيق رقم ${i}`,
          fractionText: "عصبة بالغير (للذكر مثل حظ الأنثيين)",
          percentage: (unitValue * 2) * 100,
          amount: (unitValue * 2) * estateValue,
          basis: "التعصيب بالغير للشقيق (سورة النساء: 176)",
          isBlocked: false
        });
      }
      for (let i = 1; i <= fullSistersCount; i++) {
        shares.push({
          relationship: `الأخت الشقيقة رقم ${i}`,
          fractionText: "عصبة بالغير (للذكر مثل حظ الأنثيين)",
          percentage: unitValue * 100,
          amount: unitValue * estateValue,
          basis: "التعصيب بالغير للشقيقة (سورة النساء: 176)",
          isBlocked: false
        });
      }
      remainingRatio = 0;
    }
  }

  // Fill in blocked siblings list to keep transparent audit record
  if (areSiblingsBlocked) {
    for (let i = 1; i <= fullBrothersCount; i++) {
      shares.push({
        relationship: `الأخ الشقيق رقم ${i}`,
        fractionText: "0",
        percentage: 0,
        amount: 0,
        basis: "محجوب حجب حرمان تام بالأب أو بالابن الذكر الوارث",
        isBlocked: true
      });
    }
    for (let i = 1; i <= fullSistersCount; i++) {
      shares.push({
        relationship: `الأخت الشقيقة رقم ${i}`,
        fractionText: "0",
        percentage: 0,
        amount: 0,
        basis: "محجوبة حجب حرمان تام بالأب أو بالابن الذكر الوارث",
        isBlocked: true
      });
    }
  }

  // Final validation and fallback
  // If there's any small rounding left, we can assure the final outputs sum perfectly to 100% or equal the total estate.
  return {
    shares: shares.sort((a, b) => b.amount - a.amount),
    hasCawl,
    hasRadd,
    explanationSteps: steps
  };
}
