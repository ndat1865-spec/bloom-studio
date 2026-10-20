package dh13c6.nguyentiendat516.bloom.authservice.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * SOS06 - Entity User phuc vu dang nhap va phan quyen thuc hanh.
 * LUU Y: password luu dang text dung theo bai hoc, chi dung cho tai khoan demo local.
 */
@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Tên đăng nhập không được để trống")
    @Size(max = 100, message = "Tên đăng nhập tối đa 100 ký tự")
    @Column(name = "username", nullable = false, unique = true, length = 100)
    private String username;

    @NotBlank(message = "Mật khẩu không được để trống")
    @Column(name = "password", nullable = false, length = 255)
    private String password;

    @NotNull(message = "Role phải là ADMIN, STAFF hoặc CUSTOMER")
    @Enumerated(EnumType.STRING)
    // varchar chu khong de Hibernate tao ENUM cua MySQL: xem config/SchemaUpgrade
    @Column(name = "role", nullable = false, columnDefinition = "varchar(20)")
    private Role role;

    // ============================================================
    // PHAN MO RONG ngoai SOS01-SOS10: ho so nguoi dung.
    // Tat ca deu CHO PHEP NULL — tai khoan cu tao truoc khi co ho so van dang nhap binh thuong.
    // phone/address/city dong vai tro "dia chi mac dinh", dung de dien san o trang thanh toan.
    // ============================================================

    @Size(max = 100, message = "Họ tên tối đa 100 ký tự")
    @Column(name = "full_name", length = 100)
    private String fullName;

    @Email(message = "Email không đúng định dạng")
    @Size(max = 150, message = "Email tối đa 150 ký tự")
    @Column(name = "email", length = 150)
    private String email;

    @Size(max = 20, message = "Số điện thoại tối đa 20 ký tự")
    @Column(name = "phone", length = 20)
    private String phone;

    @Size(max = 255, message = "Địa chỉ tối đa 255 ký tự")
    @Column(name = "address", length = 255)
    private String address;

    @Size(max = 60, message = "Quận / thành phố tối đa 60 ký tự")
    @Column(name = "city", length = 60)
    private String city;

    // Dia chi mac dinh theo danh muc dia gioi GHN. Ba ma di cung nhau: co du ca ba
    // hoac bo trong ca ba. Trang thanh toan dung de chon san Tinh / Quan / Phuong.
    // area_label la ten ghep san ("Phuong X, Quan Y, Tinh Z") de hien thi, khong phai
    // goi GHN chi de doi ma ra ten. Khi dat hang order-service van hoi GHN tu ma.

    @Column(name = "province_id")
    private Integer provinceId;

    @Column(name = "district_id")
    private Integer districtId;

    @Size(max = 20, message = "Mã phường/xã tối đa 20 ký tự")
    @Column(name = "ward_code", length = 20)
    private String wardCode;

    @Size(max = 200, message = "Tên khu vực tối đa 200 ký tự")
    @Column(name = "area_label", length = 200)
    private String areaLabel;

    /**
     * Ma tai khoan Google (claim "sub" trong ID token) - khong doi ke ca khi nguoi dung doi
     * email Google. Null = chua lien ket. Dang nhap Google tim tai khoan theo cot nay, KHONG
     * theo email: email trong ho so do khach tu go, chua ai xac minh.
     */
    @Column(name = "google_sub", length = 64, unique = true)
    private String googleSub;

    /**
     * Anh dai dien lay tu tai khoan Google (claim "picture"), cap nhat moi lan dang nhap
     * Google. Chi luu duong dan https cua Google, khong tai anh ve server.
     */
    @Column(name = "avatar_url", length = 500)
    private String avatarUrl;

    public String getAvatarUrl() {
        return avatarUrl;
    }

    public void setAvatarUrl(String avatarUrl) {
        this.avatarUrl = avatarUrl;
    }

    public String getGoogleSub() {
        return googleSub;
    }

    public void setGoogleSub(String googleSub) {
        this.googleSub = googleSub;
    }

    /** Ten hien thi: uu tien ho ten that, chua co thi dung username. */
    @Transient
    public String getDisplayName() {
        return (fullName != null && !fullName.isBlank()) ? fullName : username;
    }

    /** Da du thong tin de dien san form thanh toan chua. */
    @Transient
    public boolean hasDefaultAddress() {
        return phone != null && !phone.isBlank() && address != null && !address.isBlank();
    }

    /**
     * ADMIN: toan quyen. STAFF (nhan vien): xu ly don, hoa, danh muc, danh gia; chi XEM ma
     * giam gia; khong dung toi Khoa API va tai khoan nhan vien. CUSTOMER: khach hang.
     */
    public enum Role {
        ADMIN, STAFF, CUSTOMER
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public Role getRole() {
        return role;
    }

    public void setRole(Role role) {
        this.role = role;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public String getCity() {
        return city;
    }

    public void setCity(String city) {
        this.city = city;
    }

    public Integer getProvinceId() {
        return provinceId;
    }

    public void setProvinceId(Integer provinceId) {
        this.provinceId = provinceId;
    }

    public Integer getDistrictId() {
        return districtId;
    }

    public void setDistrictId(Integer districtId) {
        this.districtId = districtId;
    }

    public String getWardCode() {
        return wardCode;
    }

    public void setWardCode(String wardCode) {
        this.wardCode = wardCode;
    }

    public String getAreaLabel() {
        return areaLabel;
    }

    public void setAreaLabel(String areaLabel) {
        this.areaLabel = areaLabel;
    }
}
