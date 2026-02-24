import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RevisionStepComponent } from './revision-step.component';

describe('RevisionStepComponent', () => {
  let component: RevisionStepComponent;
  let fixture: ComponentFixture<RevisionStepComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RevisionStepComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RevisionStepComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
